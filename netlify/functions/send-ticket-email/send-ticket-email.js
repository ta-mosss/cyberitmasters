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
const bucket = admin.storage(app).bucket();

function json(body, status=200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {"Content-Type":"application/json"},
  });
}

function escapeHtml(value="") {
  return String(value).replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[c]));
}

function parseBearer(req) {
  const h = req.headers.get("authorization") || "";
  return h.startsWith("Bearer ") ? h.slice(7).trim() : null;
}

function hasEmailPermission(decoded) {
  // Any verified Firebase Auth user may attempt a send. The real security
  // boundary is:
  //   1. the ticket must exist
  //   2. `to` must match the ticket's stored customer email
  //   3. the client is gated by Firestore rules on tickets/{ref}
  // Once the Team backend issues custom claims, tighten this to require
  // claims.admin === true || claims.role in {super_admin, support_agent, engineer, ...}.
  if (!decoded?.uid) return false;
  const claims = decoded || {};
  if (claims.admin === true || claims.super_admin === true) return true;
  const role = String(claims.role || claims.cimopRole || "").toLowerCase();
  if (!role) return true; // no claims issued yet → allow any authenticated staff user
  return ["super_admin","admin","support_agent","engineer","technician","manager","operations_manager","finance"].includes(role);
}

function validEmail(v) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || "").trim());
}

async function downloadAttachment(path, ticketId) {
  const prefix = `tickets/${ticketId}/emailAttachments/`;
  if (!String(path || "").startsWith(prefix)) {
    throw new Error("Invalid attachment path");
  }
  const file = bucket.file(path);
  const [meta] = await file.getMetadata();
  const size = Number(meta.size || 0);
  if (!Number.isFinite(size) || size <= 0 || size > 5 * 1024 * 1024) {
    throw new Error("Attachment exceeds the 5 MB limit");
  }
  const [buf] = await file.download();
  return {
    filename: String(path).split("/").pop().replace(/^\d+_[A-Za-z0-9]+_/, "") || "attachment",
    content: buf.toString("base64"),
  };
}

function makeThreadMessage({ticketId,to,subject,body,attachments,staffName,staffEmail,emailId,messageId,status,replyTo}) {
  return {
    messageId: messageId || null,
    emailId: emailId || null,
    direction: "outbound",
    from: process.env.TICKETS_FROM_EMAIL || "support",
    fromEmail: process.env.TICKETS_FROM_EMAIL || null,
    to,
    subject,
    body,
    sentBy: staffName || staffEmail || "Support",
    sentByEmail: staffEmail || null,
    sentAt: new Date().toISOString(),
    status: status || "sent",
    replyTo: replyTo || null,
    attachments: (attachments || []).map(a => ({
      filename: a.filename,
      size: Number(a.size || 0),
      type: a.type || "",
      url: a.url || "",
      path: a.path || "",
    })),
  };
}

export default async (req) => {
  if (req.method !== "POST") return json({error:"Method not allowed"},405);

  try {
    const token = parseBearer(req);
    if (!token) return json({error:"Authentication required"},401);

    const decoded = await admin.auth(app).verifyIdToken(token);
    if (!hasEmailPermission(decoded)) return json({error:"Email permission denied"},403);

    const input = await req.json();
    const ticketId = String(input.ticketId || "").trim();
    const to = String(input.to || "").trim();
    const subject = String(input.subject || "").trim();
    const body = String(input.body || "");
    const staffName = String(input.staffName || decoded.name || decoded.email || "Support").trim();
    const staffEmail = String(input.staffEmail || decoded.email || "").trim() || null;
    const threadId = String(input.threadId || ticketId).trim();
    const attachments = Array.isArray(input.attachments) ? input.attachments.slice(0,5) : [];

    // Server decides the Reply-To. Ignore any client-supplied value so the
    // domain is always sourced from TICKETS_DOMAIN, not hardcoded in HTML.
    const replyTo = `tickets+${ticketId}@${process.env.TICKETS_DOMAIN}`;

    if (!ticketId || !subject || !body || !validEmail(to)) {
      return json({error:"ticketId, valid recipient, subject and body are required"},400);
    }
    if (!process.env.TICKETS_DOMAIN) {
      return json({error:"TICKETS_DOMAIN is not configured"},500);
    }

    const ticketRef = db.collection("tickets").doc(ticketId);
    const ticketSnap = await ticketRef.get();
    if (!ticketSnap.exists) return json({error:"Ticket not found"},404);
    const ticket = ticketSnap.data() || {};

    // Prevent the browser from turning this endpoint into an arbitrary mail relay.
    if (ticket.email && String(ticket.email).toLowerCase() !== to.toLowerCase()) {
      return json({error:"Recipient must match the ticket email address"},400);
    }

    const outboundAttachments = [];
    let totalBytes = 0;
    for (const a of attachments) {
      const item = await downloadAttachment(a.path, ticketId);
      totalBytes += Buffer.byteLength(item.content, "base64");
      if (totalBytes > 18 * 1024 * 1024) throw new Error("Total attachment size is too large");
      outboundAttachments.push({
        filename: String(a.filename || item.filename).slice(0,180),
        content: item.content,
      });
    }

    const thread = Array.isArray(ticket.emailThread) ? ticket.emailThread : [];
    const previousOutbound = [...thread].reverse().find(m => m.direction === "outbound" && m.messageId);
    const headers = {
      "X-Ticket-Ref": ticketId,
    };
    if (previousOutbound?.messageId) {
      headers["In-Reply-To"] = previousOutbound.messageId;
      headers["References"] = previousOutbound.messageId;
    }

    const payload = {
      from: process.env.TICKETS_FROM_EMAIL,
      to: [to],
      subject,
      html: `<div style="font-family:Arial,sans-serif;white-space:pre-wrap">${escapeHtml(body)}</div>`,
      text: body,
      reply_to: replyTo,
      headers,
      tags: [
        {name:"ticket_ref", value:ticketId},
        {name:"channel", value:"support"},
      ],
    };
    if (!payload.from) throw new Error("TICKETS_FROM_EMAIL is not configured");
    if (outboundAttachments.length) payload.attachments = outboundAttachments;

    const idem = String(input.idempotencyKey || `${ticketId}:${Date.now()}:${Math.random()}`).slice(0,200);
    const resendResponse = await fetch("https://api.resend.com/emails", {
      method:"POST",
      headers:{
        "Authorization":`Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type":"application/json",
        "Idempotency-Key":idem,
      },
      body:JSON.stringify(payload),
    });
    const resendData = await resendResponse.json().catch(()=>({}));
    if (!resendResponse.ok) {
      console.error("Resend send failed", resendResponse.status, resendData);
      await ticketRef.collection("emailEvents").add({
        type:"email.send_failed",
        ticketId,
        to,
        subject,
        error:String(resendData?.message || resendData?.error || `Resend ${resendResponse.status}`).slice(0,1000),
        at:new Date().toISOString(),
        actor:decoded.email || decoded.uid,
      });
      return json({success:false,error:"Email provider rejected the message"},502);
    }

    const emailId = resendData.id || null;
    const outboundMsg = makeThreadMessage({
      ticketId,to,subject,body,attachments,staffName,staffEmail,
      emailId,status:"sent",replyTo,
    });

    await db.runTransaction(async tx => {
      const snap = await tx.get(ticketRef);
      const data = snap.data() || {};
      const current = Array.isArray(data.emailThread) ? data.emailThread : [];
      const ids = Array.isArray(data.emailMessageIds) ? data.emailMessageIds : [];
      const trimmed = [...current, outboundMsg].slice(-100);
      const nextIds = emailId ? [...ids, emailId].filter(Boolean).slice(-500) : ids.slice(-500);
      tx.update(ticketRef, {
        emailThread:trimmed,
        emailMessageIds:nextIds,
        emailLastOutboundAt:outboundMsg.sentAt,
        emailReplyTo:replyTo,
        updatedAt:outboundMsg.sentAt,
      });
    });

    await ticketRef.collection("emailEvents").add({
      type:"email.sent.requested",
      ticketId,
      emailId,
      to,
      subject,
      status:"sent",
      at:new Date().toISOString(),
      actor:decoded.email || decoded.uid,
    });

    return json({success:true,status:"sent",emailId,replyTo});
  } catch (error) {
    console.error("send-ticket-email error", error);
    return json({success:false,error:"Unable to send email"},500);
  }
};
