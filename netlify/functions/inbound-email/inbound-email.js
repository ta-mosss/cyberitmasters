const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { getStorage } = require('firebase-admin/storage');
const { Resend } = require('resend');
const { Webhook } = require('svix');
const crypto = require('crypto');

let db, storage, resend;

function initFirebase() {
  if (db) return;
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  if (!getApps().length) {
    initializeApp({
      credential: cert(serviceAccount),
      projectId: process.env.FIREBASE_PROJECT_ID,
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    });
  }
  db = getFirestore();
  storage = getStorage();
  resend = new Resend(process.env.RESEND_API_KEY);
}

function textBody(email) {
  return String(email?.text || email?.text_body || email?.html || email?.html_body || '').slice(0, 30000);
}

function headerValue(email, key) {
  const headers = email?.headers || {};
  if (Array.isArray(headers)) {
    const item = headers.find(h => String(h?.name || '').toLowerCase() === key.toLowerCase());
    return item?.value || '';
  }
  return headers[key] || headers[key.toLowerCase()] || '';
}

function normaliseEmail(value) {
  const raw = String(value || '');
  const match = raw.match(/<([^>]+)>/);
  return (match ? match[1] : raw).trim().toLowerCase();
}

function extractTicketId(email) {
  const candidates = [
    headerValue(email, 'x-ticket-id'),
    headerValue(email, 'in-reply-to'),
    headerValue(email, 'references'),
    email?.subject,
    email?.to,
  ].map(String);
  for (const value of candidates) {
    const match = value.match(/CIM-[A-Z0-9-]{6,}/i);
    if (match) return match[0].toUpperCase();
    const plus = value.match(/tickets\+([^@]+)@/i);
    if (plus) return plus[1];
  }
  return null;
}

async function matchTicket(email) {
  const candidate = extractTicketId(email);
  if (candidate) {
    const byRef = await db.collection('tickets').where('ref', '==', candidate).limit(1).get();
    if (!byRef.empty) return byRef.docs[0].ref;
    const direct = await db.collection('tickets').doc(candidate).get();
    if (direct.exists) return direct.ref;
  }

  const messageId = String(email?.message_id || email?.messageId || headerValue(email, 'message-id') || '').trim();
  if (messageId) {
    const snap = await db.collection('tickets')
      .where('emailMessageIds', 'array-contains', messageId)
      .limit(1)
      .get();
    if (!snap.empty) return snap.docs[0].ref;
  }

  const sender = normaliseEmail(email?.from);
  if (!sender) return null;
  const snap = await db.collection('tickets')
    .where('email', '==', sender)
    .limit(50)
    .get();

  const subject = String(email?.subject || '').toLowerCase();
  const ticket = snap.docs.find(d => {
    const t = d.data();
    return t.status !== 'closed' && (
      subject.includes(String(t.ref || '').toLowerCase()) ||
      subject.includes(String(t.ticketNumber || '').toLowerCase())
    );
  });
  return ticket?.ref || null;
}

async function appendToTicket(ticketRef, email) {
  const snap = await ticketRef.get();
  if (!snap.exists) throw new Error('Matched ticket no longer exists.');
  const ticket = snap.data();
  const messageId = String(email?.message_id || email?.messageId || headerValue(email, 'message-id') || crypto.randomUUID());
  const entry = {
    direction: 'inbound',
    messageId,
    from: normaliseEmail(email?.from),
    to: email?.to || '',
    subject: String(email?.subject || '').slice(0, 300),
    body: textBody(email),
    receivedAt: new Date().toISOString(),
  };
  const thread = Array.isArray(ticket.emailThread) ? ticket.emailThread : [];
  const ids = Array.isArray(ticket.emailMessageIds) ? ticket.emailMessageIds : [];
  if (ids.includes(messageId)) return false;
  await ticketRef.update({
    emailThread: [...thread, entry].slice(-100),
    emailMessageIds: [...ids, messageId].slice(-100),
    lastCustomerEmailAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  return true;
}

async function createTicketFromEmail(email) {
  const from = normaliseEmail(email?.from);
  if (!from) throw new Error('Inbound email has no valid sender.');

  const ref = `CIM-EM-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
  const ticket = {
    ref,
    ticketNumber: ref,
    requesterEmail: from,
    email: from,
    clientName: String(email?.from || from).slice(0, 160),
    issueTitle: String(email?.subject || 'Email support request').slice(0, 240),
    issueDetail: textBody(email),
    problemDescription: textBody(email),
    priority: 'medium',
    status: 'open',
    assignedEngineer: 'Unassigned',
    channels: ['email'],
    contactMethod: 'email',
    attachments: [],
    notes: [],
    emailThread: [{
      direction: 'inbound',
      messageId: String(email?.message_id || email?.messageId || headerValue(email, 'message-id') || crypto.randomUUID()),
      from,
      to: email?.to || '',
      subject: String(email?.subject || '').slice(0, 300),
      body: textBody(email),
      receivedAt: new Date().toISOString(),
    }],
    emailMessageIds: [],
    loggedBy: 'email',
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };
  ticket.emailMessageIds = ticket.emailThread.map(x => x.messageId);
  const refDoc = db.collection('tickets').doc(ref);
  await refDoc.set(ticket);
  return refDoc;
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method not allowed' };

  try {
    const secret = process.env.RESEND_WEBHOOK_SECRET;
    if (!secret) throw new Error('RESEND_WEBHOOK_SECRET is not configured.');

    const wh = new Webhook(secret);
    const payload = wh.verify(event.body, {
      'svix-id': event.headers['svix-id'],
      'svix-timestamp': event.headers['svix-timestamp'],
      'svix-signature': event.headers['svix-signature'],
    });

    if (payload.type !== 'email.received') return { statusCode: 200, body: 'Ignored' };

    initFirebase();
    const emailId = payload.data.email_id;
    const { data: email } = await resend.emails.receiving.get(emailId);
    if (!email) throw new Error('Received email could not be loaded.');

    const ticketRef = await matchTicket(email);
    if (ticketRef) {
      await appendToTicket(ticketRef, email);
    } else {
      const created = await createTicketFromEmail(email);
      // Auto acknowledgement is deliberately handled by the normal outbound
      // ticket-email path rather than duplicating provider logic here.
      console.log(`Created inbound email ticket ${created.id}`);
    }

    return { statusCode: 200, body: 'OK' };
  } catch (error) {
    console.error('Inbound email error:', error);
    return { statusCode: error.statusCode || 500, body: JSON.stringify({ error: error.message }) };
  }
};
