import { Resend } from "resend";
import admin from "firebase-admin";

const resend = new Resend(process.env.RESEND_API_KEY);

function initFirebase() {
  if (admin.apps.length) return admin.app();
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) throw new Error("FIREBASE_SERVICE_ACCOUNT is not configured");
  const serviceAccount = JSON.parse(raw);
  return admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || serviceAccount.storage_bucket,
  });
}
const app = initFirebase();
const db = admin.firestore();

function json(body,status=200){
  return new Response(JSON.stringify(body),{status,headers:{"Content-Type":"application/json"}});
}

// Strict: only match explicit ticket-ref formats. The previous fallback to
// "any 4+ digit number" was too eager and could attach a reply to the wrong
// ticket if the subject or body happened to contain a phone number, invoice
// number, or year.
function ticketRefFromText(...values){
  const joined = values.filter(Boolean).join(" ");
  const m = joined.match(/\b(IT|TKT|CIM)-?\d{3,}\b/i);
  return m ? m[0].toUpperCase().replace(/\s+/g, "") : null;
}

function normaliseEmail(v=""){
  const m=String(v).match(/<([^>]+)>/);
  return (m?m[1]:String(v)).trim().toLowerCase();
}

function allowedSender(email){
  const e=normaliseEmail(email);
  const exact=(process.env.ALLOWED_INBOUND_SENDERS||"").split(",").map(x=>x.trim().toLowerCase()).filter(Boolean);
  const domains=(process.env.ALLOWED_INBOUND_DOMAINS||"").split(",").map(x=>x.trim().toLowerCase().replace(/^@/,"")).filter(Boolean);
  if(!exact.length && !domains.length) return true;
  return exact.includes(e) || domains.some(d=>e.endsWith(`@${d}`));
}

function parseTicketFromRecipients(to=[]){
  const domain=(process.env.TICKETS_DOMAIN||"").toLowerCase();
  for(const raw of Array.isArray(to)?to:[to]){
    const email=normaliseEmail(raw);
    const local=email.split("@")[0];
    const m=local.match(/^tickets\+(.+)$/i);
    if(m && (!domain || email.endsWith(`@${domain}`))) return m[1].toUpperCase();
  }
  return null;
}

async function updateThread(ticketRef, message, eventId, emailId){
  const ref=db.collection("tickets").doc(ticketRef);
  await db.runTransaction(async tx=>{
    const snap=await tx.get(ref);
    if(!snap.exists) throw new Error("Ticket not found");
    const data=snap.data()||{};
    const existing=Array.isArray(data.emailThread)?data.emailThread:[];
    const ids=Array.isArray(data.emailMessageIds)?data.emailMessageIds:[];
    if(emailId && ids.includes(emailId)) return; // webhook retry → no-op

    const thread=[...existing,message].slice(-100);
    const update={
      emailThread:thread,
      emailMessageIds:emailId?[...ids,emailId].slice(-500):ids.slice(-500),
      emailLastInboundAt:message.receivedAt,
      updatedAt:message.receivedAt,
    };

    // A reply on a closed/resolved ticket reopens it so the operator notices.
    if(data.status==="closed" || data.status==="resolved"){
      update.status="open";
      update.reopenedAt=message.receivedAt;
      update.reopenedBy="email";
      const timeline=Array.isArray(data.timeline)?data.timeline.slice():[];
      timeline.push({
        id:`tl_email_reopen_${Date.now()}`,
        type:"status",
        title:"Ticket reopened by email reply",
        detail:`Client replied from ${message.fromEmail || message.from || "unknown"}`,
        at:message.receivedAt,
        actorEmail:message.fromEmail || null,
        actorName:message.from || "Client",
      });
      update.timeline=timeline.slice(-250);
    }

    tx.update(ref,update);
  });

  await ref.collection("emailEvents").doc(String(eventId||emailId||Date.now())).set({
    type:"email.received",
    emailId:eventId || emailId || null,
    at:new Date().toISOString(),
    ticketRef,
  },{merge:true});
}

async function updateDeliveryStatus(emailId,status,event){
  if(!emailId) return;
  const tickets=await db.collection("tickets").where("emailMessageIds","array-contains",emailId).limit(1).get();
  if(tickets.empty) return;
  const ref=tickets.docs[0].ref;
  await db.runTransaction(async tx=>{
    const snap=await tx.get(ref);
    const data=snap.data()||{};
    const thread=Array.isArray(data.emailThread)?data.emailThread:[];
    let changed=false;
    const next=thread.map(m=>{
      if(m.emailId!==emailId) return m;
      changed=true;
      return {...m,status,emailStatus:event.type,lastEmailEventAt:event.created_at||new Date().toISOString(),deliveryDetail:event.data?.bounce?.message||event.data?.reason||null,messageId:m.messageId||event.data?.message_id||null};
    });
    if(changed) tx.update(ref,{emailThread:next,updatedAt:new Date().toISOString()});
  });
  await ref.collection("emailEvents").add({
    type:event.type,emailId,at:event.created_at||new Date().toISOString(),
    payload:{
      to:event.data?.to||null,
      bounce:event.data?.bounce||null,
      reason:event.data?.reason||null,
      messageId:event.data?.message_id||null,
    }
  });
}

export default async (req) => {
  if(req.method!=="POST") return json({error:"Method not allowed"},405);

  try{
    const payload=await req.text();
    const event=resend.webhooks.verify({
      payload,
      headers:{
        id:req.headers.get("svix-id"),
        timestamp:req.headers.get("svix-timestamp"),
        signature:req.headers.get("svix-signature"),
      },
      secret:process.env.RESEND_WEBHOOK_SECRET,
    });

    if(event.type==="email.received"){
      const d=event.data||{};
      const sender=normaliseEmail(d.from);
      if(!allowedSender(sender)){
        console.warn("Rejected inbound sender",sender);
        return json({ok:true,rejected:true});
      }

      const {data:email,error}=await resend.emails.receiving.get(d.email_id);
      if(error) throw new Error(error.message || "Unable to retrieve received email");

      const to=email?.to || d.to || [];
      let ticketRef=parseTicketFromRecipients(to);
      const fullText=String(email?.text || "").trim();
      const subject=String(email?.subject || d.subject || "").trim();

      // Fallback: subject / headers only. No bare-number fallback.
      if(!ticketRef){
        ticketRef=ticketRefFromText(subject, email?.headers?.["in-reply-to"], email?.headers?.references);
      }

      if(!ticketRef){
        console.warn("Inbound email did not contain a ticket reference", {subject,to});
        return json({ok:true,unmatched:true});
      }

      const ref=db.collection("tickets").doc(ticketRef);
      const snap=await ref.get();
      if(!snap.exists){
        console.warn("Inbound email ticket not found",ticketRef);
        return json({ok:true,unmatched:true});
      }

      const receivedAt=d.created_at || email?.created_at || new Date().toISOString();
      const attachments=(email?.attachments||[]).map(a=>({
        id:a.id||null,
        filename:a.filename||a.name||"attachment",
        size:Number(a.size||0),
        type:a.content_type||a.type||"",
        url:a.download_url||a.url||"",
      }));

      const message={
        messageId:d.message_id||email?.message_id||null,
        emailId:d.email_id||email?.id||null,
        direction:"inbound",
        from:d.from||email?.from||sender,
        fromEmail:sender,
        to,
        subject,
        body:fullText || String(email?.html||"").replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim(),
        receivedAt,
        status:"received",
        attachments,
      };

      await updateThread(ticketRef,message,d.email_id||event.created_at,d.email_id);
      return json({ok:true,threaded:true,ticketRef});
    }

    const deliveryTypes=new Set([
      "email.sent","email.delivered","email.delivery_delayed","email.bounced",
      "email.failed","email.complained","email.opened","email.clicked"
    ]);
    if(deliveryTypes.has(event.type)){
      await updateDeliveryStatus(event.data?.email_id,event.type.replace(/^email\./,""),event);
      return json({ok:true,updated:true});
    }

    return json({ok:true,ignored:event.type});
  }catch(error){
    console.error("inbound-email error",error);
    return json({error:"Invalid webhook or processing failure"},400);
  }
};
