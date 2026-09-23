const { FieldValue, Timestamp } = require('firebase-admin/firestore');
const { initAdmin } = require('../_lib/auth');
const { Resend } = require('resend');

const DEFAULTS={urgent:{target:240,warning:60},high:{target:480,warning:120},medium:{target:1440,warning:240},low:{target:2880,warning:480}};
const OPEN=new Set(['open','new','assigned','in-progress','awaiting-customer','awaiting-parts','scheduled','en-route','onsite','pending']);
function businessMinutesBetween(start,end){
  let a=new Date(start), b=new Date(end); if(!(a instanceof Date)||isNaN(a)||isNaN(b)||b<=a)return 0; let total=0, cur=new Date(a);
  while(cur<b){ const day=cur.getDay(); if(day!==0&&day!==6){ const y=cur.getFullYear(),m=cur.getMonth(),d=cur.getDate(); const bs=new Date(y,m,d,8,0,0,0), be=new Date(y,m,d,17,0,0,0); const from=new Date(Math.max(cur.getTime(),bs.getTime())), to=new Date(Math.min(b.getTime(),be.getTime())); if(to>from) total += (to-from)/60000; } cur.setDate(cur.getDate()+1); cur.setHours(0,0,0,0); }
  return Math.round(total);
}
function dueFrom(start,minutes){ let cur=new Date(start), remain=minutes; while(remain>0){ if(cur.getDay()===0||cur.getDay()===6){cur.setDate(cur.getDate()+1);cur.setHours(8,0,0,0);continue;} if(cur.getHours()<8)cur.setHours(8,0,0,0); if(cur.getHours()>=17){cur.setDate(cur.getDate()+1);cur.setHours(8,0,0,0);continue;} const available=(17-cur.getHours()-cur.getMinutes()/60)*60; const use=Math.min(remain,available); cur=new Date(cur.getTime()+use*60000); remain-=use; } return cur; }
async function notify(db, subject, text, key){
  const recipients=String(process.env.SLA_ALERT_EMAILS||'').split(',').map(x=>x.trim()).filter(Boolean); if(!recipients.length)return;
  const resendKey=process.env.RESEND_API_KEY; if(resendKey){ try { const resend=new Resend(resendKey); await resend.emails.send({from:process.env.TICKETS_FROM_EMAIL||'ITsupport@mbulahenigroup.co.za',to:recipients,subject,text}); } catch(e){console.error('SLA email failed',e);} }
  await db.collection('automationEscalations').doc(key).set({subject,text,recipients,createdAt:FieldValue.serverTimestamp(),type:'sla'}, {merge:true});
}
exports.handler=async(event)=>{
  try{
    const {db}=initAdmin(); const policiesSnap=await db.collection('slaPolicies').get(); const policies={...DEFAULTS}; policiesSnap.forEach(d=>{const x=d.data(); if(x.priority&&x.targetMinutes)policies[String(x.priority).toLowerCase()]={target:Number(x.targetMinutes),warning:Number(x.warningMinutes||Math.round(x.targetMinutes*.25))};});
    const snap=await db.collection('tickets').where('status','in',Array.from(OPEN).slice(0,10)).limit(500).get(); let updated=0,alerts=0;
    for(const doc of snap.docs){ const t=doc.data(); const created=t.createdAt?.toDate?.() || new Date(t.createdAt||0); if(isNaN(created))continue; const p=policies[String(t.priority||'medium').toLowerCase()]||policies.medium; const due=t.slaDueAt?.toDate?.()||dueFrom(created,p.target); const elapsed=businessMinutesBetween(created,new Date()); const warningAt=Math.max(0,p.target-p.warning); let status=elapsed>=p.target?'breached':(elapsed>=warningAt?'at-risk':'within-sla'); const update={slaStatus:status,slaTargetMinutes:p.target,slaElapsedBusinessMinutes:elapsed,slaDueAt:Timestamp.fromDate(due),slaLastEvaluatedAt:FieldValue.serverTimestamp(),updatedAt:FieldValue.serverTimestamp()};
      const prior=t.slaStatus||'tracking'; if(status!==prior){ if(status==='at-risk'||status==='breached'){const key=`${doc.id}:${status}`; await notify(db,`SLA ${status.toUpperCase()}: ${t.ref||doc.id}`,`Ticket ${t.ref||doc.id} is ${status}. Priority: ${t.priority||'medium'}. Target: ${p.target} business minutes. Elapsed: ${elapsed} business minutes.`,key); alerts++;} update.slaEscalationLevel=status; }
      await doc.ref.update(update); updated++;
    }
    return {statusCode:200,body:JSON.stringify({success:true,checked:snap.size,updated,alerts})};
  }catch(e){console.error('sla-monitor error',e);return {statusCode:500,body:JSON.stringify({error:e.message})};}
};
exports.config={schedule:'*/15 * * * *'};
