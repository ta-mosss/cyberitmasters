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

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: 'Method not allowed' };
  }

  try {
    const { ticketId, to, subject, body, messageId } = JSON.parse(event.body);

    // TODO: Add staff authentication check here
    // The setup doc notes you may want to restrict this to engineers only

    initFirebase();

    const ticketRef = db.collection('tickets').doc(ticketId);
    const ticket = await ticketRef.get();

    if (!ticket.exists) {
      return { statusCode: 404, headers, body: JSON.stringify({ error: 'Ticket not found' }) };
    }

    const ticketData = ticket.data();

    // Build threading headers so replies land on the same ticket
    // Reply-To format: tickets+<REF>@<TICKETS_DOMAIN>
    const replyTo = `tickets+${ticketId}@${process.env.TICKETS_DOMAIN}`;

    const thread = ticketData.emailThread || [];
    const lastMessageId = thread.length > 0 ? thread[thread.length - 1].messageId : null;

    const sendPayload = {
      from: process.env.TICKETS_FROM_EMAIL,
      to,
      subject: subject || `Re: ${ticketData.subject || 'Your ticket'}`,
      html: body,
      replyTo,
    };

    // Add In-Reply-To and References for email client threading
    if (lastMessageId) {
      sendPayload.headers = {
        'In-Reply-To': lastMessageId,
        'References': thread.map(m => m.messageId).filter(Boolean).join(' '),
      };
    }

    const { data, error } = await resend.emails.send(sendPayload);
    if (error) throw new Error(error.message);

    // Append outbound message to the ticket thread
    await ticketRef.update({
      emailThread: [...thread, {
        direction: 'outbound',
        messageId: data.id,
        from: process.env.TICKETS_FROM_EMAIL,
        to,
        subject: sendPayload.subject,
        body,
        sentAt: new Date().toISOString(),
        sentBy: 'engineer', // or the staff user ID
      }],
      emailMessageIds: [...(ticketData.emailMessageIds || []), data.id],
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, messageId: data.id }),
    };
  } catch (error) {
    console.error('Send ticket email error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
