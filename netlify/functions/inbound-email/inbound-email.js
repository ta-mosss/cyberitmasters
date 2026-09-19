const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getStorage } = require('firebase-admin/storage');
const { Resend } = require('resend');
const { Webhook } = require('svix');

let db, storage, resend;

function initFirebase() {
  if (db) return;
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  initializeApp({
    credential: cert(serviceAccount),
    projectId: 'test-bot-49f99',
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || 'test-bot-49f99.firebasestorage.app',
  });
  db = getFirestore();
  storage = getStorage();
  resend = new Resend(process.env.RESEND_API_KEY);
}

exports.handler = async (event) => {
  // Only accept POST from Resend
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  try {
    // 1. Verify webhook signature using Svix
    //    Resend uses Svix for webhook delivery — the raw body is critical
    const wh = new Webhook(process.env.RESEND_WEBHOOK_SECRET);
    const payload = wh.verify(event.body, {
      'svix-id': event.headers['svix-id'],
      'svix-timestamp': event.headers['svix-timestamp'],
      'svix-signature': event.headers['svix-signature'],
    });

    // Guard: only process email.received events
    if (payload.type !== 'email.received') {
      return { statusCode: 200, body: 'Ignored' };
    }

    initFirebase();

    // 2. Fetch the full email content from Resend
    //    Webhooks only contain metadata — you must call the Received emails API
    const emailId = payload.data.email_id;
    const { data: email } = await resend.emails.receiving.get(emailId);

    // 3. Determine if this is a new ticket or a reply to an existing one
    const ticketRef = await matchTicket(email);

    // 4. Create new ticket OR append to existing thread
    if (!ticketRef) {
      await createTicketFromEmail(email);
    } else {
      await appendToTicket(ticketRef, email);
    }

    // 5. Send auto-acknowledgement for new tickets
    // ... (see threading logic below)

    return { statusCode: 200, body: 'OK' };
  } catch (error) {
    console.error('Inbound email error:', error);
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};
