const { FieldValue } = require('firebase-admin/firestore');
const { verifyStaff } = require('../_lib/auth');

function headers(event) {
  const origin = event.headers?.origin || event.headers?.Origin || '';
  const allowed = String(process.env.ALLOWED_ORIGINS || '').split(',').map(x=>x.trim()).filter(Boolean);
  return {'Access-Control-Allow-Origin': allowed.length && allowed.includes(origin) ? origin : (allowed[0] || origin || '*'),'Vary':'Origin','Access-Control-Allow-Headers':'Content-Type, Authorization','Access-Control-Allow-Methods':'POST, OPTIONS','Content-Type':'application/json'};
}
const json=(status,body,event)=>({statusCode:status,headers:headers(event),body:JSON.stringify(body)});

exports.handler = async event => {
  if(event.httpMethod==='OPTIONS') return {statusCode:204,headers:headers(event),body:''};
  if(event.httpMethod!=='POST') return json(405,{error:'Method not allowed'},event);
  try {
    const staff = await verifyStaff(event,{managersOnly:true});
    const body = JSON.parse(event.body || '{}');
    const ticketRef = String(body.ticketRef || '').trim();
    const ticketSnap = ticketRef ? await staff.db.collection('tickets').doc(ticketRef).get() : null;
    const ticket = ticketSnap?.exists ? ticketSnap.data() : null;
    if(ticketRef && !ticket) return json(404,{error:'Ticket not found.'},event);

    const counter = staff.db.collection('meta').doc('counters');
    const job = staff.db.collection('jobs').doc();
    let number;
    await staff.db.runTransaction(async tx => {
      const snap = await tx.get(counter);
      const current = snap.exists && Number.isInteger(snap.data().jobSequence) ? snap.data().jobSequence : 0;
      const next = current + 1;
      number = `JOB-${String(next).padStart(7,'0')}`;
      if(snap.exists) tx.update(counter,{jobSequence:next,updatedAt:FieldValue.serverTimestamp()});
      else tx.set(counter,{jobSequence:next,updatedAt:FieldValue.serverTimestamp()},{merge:true});
      tx.set(job,{
        jobNumber:number,ticketRef:ticketRef||null,customerName:String(body.customerName || ticket?.company || ticket?.clientName || ticket?.name || ''),
        jobType:String(body.jobType||'Onsite'),assignedEngineer:String(body.assignedEngineer||'Unassigned'),
        scheduledDate:String(body.scheduledDate||''),scheduledTime:String(body.scheduledTime||''),priority:String(body.priority||'medium'),
        scope:String(body.scope||'').slice(0,12000),status:String(body.status||'scheduled'),createdBy:staff.decoded.uid,createdByEmail:staff.decoded.email||null,
        createdAt:FieldValue.serverTimestamp(),updatedAt:FieldValue.serverTimestamp()
      });
    });
    await staff.db.collection('auditLogs').add({action:'job.created',jobNumber:number,ticketRef:ticketRef||null,actor:staff.decoded.email||staff.decoded.uid,actorUid:staff.decoded.uid,createdAt:FieldValue.serverTimestamp()});
    return json(200,{success:true,jobNumber:number,jobId:job.id},event);
  } catch(e){ console.error('create-job error',e); return json(e.statusCode||500,{error:e.message||'Internal server error.'},event); }
};
