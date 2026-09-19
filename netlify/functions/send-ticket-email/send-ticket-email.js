const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { Resend } = require('resend');

let db, resend;

function initFirebase() {
  if (db) return;
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  initializeApp({
    credential: cert(serviceAccount),
    projectId: 'test-bot-49f99',
  });
  db = getFirestore();
  resend = new Resend(process.env.RESEND_API_KEY);
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function ts() { return new Date().toISOString(); }

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: CORS, body: 'Method not allowed' };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const { ticketId, to, subject, body: emailBody, staffName, staffEmail } = body;

    if (!ticketId || !to || !emailBody) {
      return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Missing ticketId, to, or body' }) };
    }

    // TODO: Add Firebase Auth verification here if you want to restrict this
    //       to signed-in engineers only (see "hardening" note at bottom)

    initFirebase();

    const ticketRef = db.collection('tickets').doc(ticketId);
    const ticketSnap = await ticketRef.get();
    if (!ticketSnap.exists) {
      return { statusCode: 404, headers: CORS, body: JSON.stringify({ error: `Ticket ${ticketId} not found` }) };
    }
    const ticket = ticketSnap.data() || {};
    const thread = Array.isArray(ticket.emailThread) ? ticket.emailThread.slice() : [];

    const lastMessageId = (() => {
      for (let i = thread.length - 1; i >= 0; i--) {
        if (thread[i]?.messageId) return thread[i].messageId;
      }
      return null;
    })();

    const replyTo = `tickets+${ticketId}@${process.env.TICKETS_DOMAIN}`;
    const fromAddress = process.env.TICKETS_FROM_EMAIL;
    const subj = subject || `Re: ${ticket.issueTitle || ticket.problemDescription?.slice(0, 60) || ticket.ref}`;

    const headers = {};
    if (lastMessageId) {
      headers['In-Reply-To'] = lastMessageId;
      const refs = thread.map((m) => m.messageId).filter(Boolean);
      if (refs.length) headers['References'] = refs.join(' ');
    }

    const { data, error } = await resend.emails.send({
      from: fromAddress,
      to,
      subject: subj,
      html: emailBody,
      replyTo,
      headers,
    });

    if (error) throw new Error(error.message);

    const outbound = {
      direction: 'outbound',
      messageId: data.id,
      from: fromAddress,
      to,
      subject: subj,
      body: emailBody,
      html: emailBody,
      sentAt: ts(),
      sentBy: staffName || staffEmail || 'engineer',
      staffEmail: staffEmail || null,
    };

    const timeline = Array.isArray(ticket.timeline) ? ticket.timeline.slice() : [];
    timeline.push({
      id: `tl_email_${Date.now()}`,
      type: 'note',
      title: 'Email reply sent',
      detail: `To ${to}: ${subj}`,
      at: ts(),
      actorEmail: staffEmail || null,
      actorName: staffName || staffEmail || 'Engineer',
    });

    await ticketRef.update({
      emailThread: [...thread, outbound].slice(-200),
      emailMessageIds: [...(ticket.emailMessageIds || []), data.id].slice(-500),
      timeline: timeline.slice(-250),
      updatedAt: ts(),
    });

    return {
      statusCode: 200,
      headers: CORS,
      body: JSON.stringify({ success: true, messageId: data.id }),
    };
  } catch (err) {
    console.error('send-ticket-email error:', err);
    return {
      statusCode: 500,
      headers: CORS,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
