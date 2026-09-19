const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getStorage } = require('firebase-admin/storage');
const { Resend } = require('resend');
const { Webhook } = require('svix');

let db, storage, resend, app;

function initFirebase() {
  if (db) return;
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  app = initializeApp({
    credential: cert(serviceAccount),
    projectId: 'test-bot-49f99',
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || 'test-bot-49f99.firebasestorage.app',
  });
  db = getFirestore();
  storage = getStorage();
  resend = new Resend(process.env.RESEND_API_KEY);
}

/* ─────────────────────────────────────────────
   Helpers
───────────────────────────────────────────── */
function ts() { return new Date().toISOString(); }

async function nextTicketNumber() {
  const ref = db.collection('meta').doc('counter');
  return await db.runTransaction(async (tx) => {
    const doc = await tx.get(ref);
    const current = doc.exists ? doc.data().val : 1000;
    const next = current + 1;
    tx.set(ref, { val: next });
    return next;
  });
}
function makeTktRef(num) { return `CIM-${String(num).padStart(4, '0')}`; }

function normalisePhone(p) {
  if (!p) return '';
  const c = String(p).replace(/[^0-9]/g, '');
  if (c.startsWith('27')) return c;
  if (c.startsWith('0')) return '27' + c.slice(1);
  return c;
}

function extractEmails(str) {
  if (!str) return [];
  if (Array.isArray(str)) return str.flatMap(extractEmails);
  const matches = String(str).match(/[^\s<>,]+@[^\s<>,]+/g) || [];
  return matches.map((m) => m.toLowerCase());
}

function stripHtml(html) {
  if (!html) return '';
  return String(html)
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

/* ─────────────────────────────────────────────
   Ticket matching: 3-tier strategy
   1. Reply-To address (tickets+<REF>@domain)
   2. In-Reply-To / References vs emailMessageIds
   3. Subject line CIM-#### tag
───────────────────────────────────────────── */
async function matchTicket(email) {
  const domain = process.env.TICKETS_DOMAIN;

  // Tier 1 — reply-to / to / cc / delivered-to headers
  const headerTargets = [
    ...extractEmails(email.to),
    ...extractEmails(email.cc),
    ...extractEmails(email.headers?.['reply-to']),
    ...extractEmails(email.headers?.['delivered-to']),
    ...extractEmails(email.headers?.['x-forwarded-to']),
  ];
  for (const addr of headerTargets) {
    const m = addr.match(/tickets\+([^@]+)@/i);
    if (m) {
      const ref = m[1].toUpperCase();
      const snap = await db.collection('tickets').doc(ref).get();
      if (snap.exists) return snap.ref;
    }
    // Also handle bare tickets@ — the ref will be in subject
  }

  // Tier 2 — threading headers vs stored message IDs
  const inReplyTo = email.headers?.['in-reply-to'] || '';
  const references = email.headers?.['references'] || '';
  const candidateIds = [
    ...extractMessageIds(inReplyTo),
    ...extractMessageIds(references),
  ].filter(Boolean);

  if (candidateIds.length) {
    // Firestore array-contains-any limit is 10
    const batches = [];
    for (let i = 0; i < candidateIds.length; i += 10) {
      batches.push(candidateIds.slice(i, i + 10));
    }
    for (const batch of batches) {
      const snap = await db
        .collection('tickets')
        .where('emailMessageIds', 'array-contains-any', batch)
        .limit(1)
        .get();
      if (!snap.empty) return snap.docs[0].ref;
    }
  }

  // Tier 3 — subject line CIM-#### tag
  const subject = email.subject || '';
  const subjMatch = subject.match(/CIM-\d+/i);
  if (subjMatch) {
    const ref = subjMatch[0].toUpperCase();
    const snap = await db.collection('tickets').doc(ref).get();
    if (snap.exists) return snap.ref;
  }

  return null;
}

function extractMessageIds(str) {
  if (!str) return [];
  const matches = String(str).match(/<[^>]+>/g) || [];
  return matches.map((m) => m.trim());
}

/* ─────────────────────────────────────────────
   Attachment handling
───────────────────────────────────────────── */
async function saveAttachments(ticketRef, attachments) {
  if (!attachments || !attachments.length) return [];
  const bucket = storage.bucket();
  const saved = [];
  for (const att of attachments.slice(0, 20)) {
    try {
      const res = await fetch(att.download_url || att.url);
      if (!res.ok) continue;
      const buffer = Buffer.from(await res.arrayBuffer());
      const safeName = String(att.filename || `attachment-${Date.now()}`).replace(/[^a-zA-Z0-9._-]/g, '_');
      const path = `tickets/${ticketRef}/email-attachments/${Date.now()}-${safeName}`;
      const file = bucket.file(path);
      await file.save(buffer, { contentType: att.content_type || 'application/octet-stream' });
      const [signedUrl] = await file.getSignedUrl({
        action: 'read',
        expires: Date.now() + 1000 * 60 * 60 * 24 * 30, // 30 days
      });
      saved.push({
        filename: att.filename || safeName,
        size: buffer.length,
        contentType: att.content_type || 'application/octet-stream',
        path,
        url: signedUrl,
      });
    } catch (e) {
      console.error('Attachment save failed:', att.filename, e.message);
    }
  }
  return saved;
}

/* ─────────────────────────────────────────────
   Ticket creation from a fresh email
───────────────────────────────────────────── */
async function createTicketFromEmail(email, messageId) {
  const num = await nextTicketNumber();
  const ref = makeTktRef(num);

  const fromAddrs = extractEmails(email.from);
  const fromEmail = fromAddrs[0] || '';
  const fromName = (email.from || '').replace(/<[^>]+>/g, '').replace(/"/g, '').trim() || fromEmail.split('@')[0];

  const subject = (email.subject || '').replace(/^(re|fwd?):\s*/i, '').trim() || '(no subject)';
  const textBody = email.text || stripHtml(email.html) || '';
  const attachments = await saveAttachments(ref, email.attachments);

  const now = ts();
  const ticket = {
    ref,
    ticketNumber: num,
    schemaVersion: 3,
    status: 'open',
    priority: 'Medium',
    serviceType: 'remote',
    source: 'email',
    loggedBy: 'Customer (via email)',
    clientName: fromName,
    name: fromName,
    email: fromEmail,
    phone: '',
    issueTitle: subject.slice(0, 140),
    problemDescription: textBody.slice(0, 4000),
    issueDetail: '',
    notes: [],
    parts: [],
    quotationRef: '',
    assignedEngineer: 'Unassigned',
    assignedUid: null,
    timeline: [{
      id: `tl_created_${Date.now()}`,
      type: 'created',
      title: 'Ticket created via email',
      detail: `Received from ${fromEmail}`,
      at: now,
      actorEmail: fromEmail,
      actorName: fromName,
    }],
    emailThread: [{
      direction: 'inbound',
      messageId,
      from: fromEmail,
      to: Array.isArray(email.to) ? email.to : extractEmails(email.to),
      cc: Array.isArray(email.cc) ? email.cc : extractEmails(email.cc),
      subject: email.subject || subject,
      body: textBody,
      html: email.html || '',
      attachments,
      sentAt: email.created_at || now,
      receivedAt: now,
    }],
    emailMessageIds: [messageId].filter(Boolean),
    emailAutoAckSent: false,
    timeTrackedMinutes: 0,
    billableMinutes: 0,
    timeEntryCount: 0,
    timeByEngineer: {},
    slaPausedBusinessMinutes: 0,
    slaPausedAt: null,
    resolvedAt: null,
    closedAt: null,
    clientSignoff: { signed: false, clientName: '', clientPosition: '', signedAt: null, signatureImage: '' },
    authorized: false,
    authorisationName: '',
    authorisationPosition: '',
    authorisationSignature: '',
    authorisationSignedAt: null,
    createdAt: now,
    updatedAt: now,
  };

  await db.collection('tickets').doc(ref).set(ticket);
  return { ref, ticket };
}

/* ─────────────────────────────────────────────
   Append inbound message to existing ticket
───────────────────────────────────────────── */
async function appendToTicket(ticketRef, email, messageId) {
  const ref = db.collection('tickets').doc(ticketRef);
  const snap = await ref.get();
  if (!snap.exists) return;
  const data = snap.data() || {};

  const fromAddrs = extractEmails(email.from);
  const fromEmail = fromAddrs[0] || '';
  const textBody = email.text || stripHtml(email.html) || '';
  const attachments = await saveAttachments(ticketRef, email.attachments);

  const inboundMsg = {
    direction: 'inbound',
    messageId,
    from: fromEmail,
    to: Array.isArray(email.to) ? email.to : extractEmails(email.to),
    cc: Array.isArray(email.cc) ? email.cc : extractEmails(email.cc),
    subject: email.subject || '',
    body: textBody,
    html: email.html || '',
    attachments,
    sentAt: email.created_at || ts(),
    receivedAt: ts(),
  };

  const thread = Array.isArray(data.emailThread) ? data.emailThread.slice() : [];
  thread.push(inboundMsg);
  const trimmedThread = thread.slice(-200);

  const ids = Array.isArray(data.emailMessageIds) ? data.emailMessageIds.slice() : [];
  if (messageId) ids.push(messageId);

  const timelineEvent = {
    id: `tl_email_${Date.now()}`,
    type: 'note',
    title: 'Email reply received',
    detail: `${fromEmail}: ${inboundMsg.subject || textBody.slice(0, 80)}`,
    at: ts(),
    actorEmail: fromEmail,
    actorName: fromEmail,
  };

  const timeline = Array.isArray(data.timeline) ? data.timeline.slice() : [];
  timeline.push(timelineEvent);

  await ref.update({
    emailThread: trimmedThread,
    emailMessageIds: ids.slice(-500),
    timeline: timeline.slice(-250),
    updatedAt: ts(),
  });
}

/* ─────────────────────────────────────────────
   Auto-acknowledgement email
───────────────────────────────────────────── */
function buildAckHtml(ticket) {
  const biz = 'Cyber I.T Masters';
  return `
  <div style="font-family:Arial,Helvetica,sans-serif;color:#1a2332;line-height:1.6;max-width:600px">
    <h2 style="color:#00C896;margin:0 0 12px">Thanks — we've logged your ticket</h2>
    <p>Hi ${(ticket.clientName || 'there').split(' ')[0]},</p>
    <p>Your email has been turned into a support ticket and our team will be in touch shortly.</p>
    <p style="background:#f4f7fb;border:1px solid #dde3ee;border-radius:8px;padding:14px 18px;font-size:16px">
      <strong>Ticket reference:</strong>
      <span style="font-family:monospace;color:#00C896;font-size:18px">${ticket.ref}</span>
    </p>
    <p>Please quote <strong>${ticket.ref}</strong> in all future communication. You can simply <strong>reply to this email</strong> and it will be added to your ticket automatically.</p>
    <hr style="border:none;border-top:1px solid #dde3ee;margin:20px 0"/>
    <p style="font-size:12px;color:#718096">${biz} · Professional I.T Solutions<br/>
    WhatsApp: 072 665 0565 · Email: info@mbulahenigroup.co.za</p>
  </div>`;
}

async function sendAutoAcknowledgement(ticket) {
  const replyTo = `tickets+${ticket.ref}@${process.env.TICKETS_DOMAIN}`;
  const sendPayload = {
    from: process.env.TICKETS_FROM_EMAIL,
    to: ticket.email,
    subject: `[${ticket.ref}] We've received your support request`,
    html: buildAckHtml(ticket),
    replyTo,
    headers: {
      'Auto-Submitted': 'auto-replied',
      'X-Auto-Response-Suppress': 'All',
    },
  };

  const { data, error } = await resend.emails.send(sendPayload);
  if (error) throw new Error(error.message);

  await db.collection('tickets').doc(ticket.ref).update({
    emailAutoAckSent: true,
    emailMessageIds: [...(ticket.emailMessageIds || []), data.id],
    emailThread: [...(ticket.emailThread || []), {
      direction: 'outbound',
      messageId: data.id,
      from: process.env.TICKETS_FROM_EMAIL,
      to: ticket.email,
      subject: sendPayload.subject,
      body: buildAckHtml(ticket),
      html: buildAckHtml(ticket),
      sentAt: ts(),
      sentBy: 'system',
      autoAck: true,
    }],
    updatedAt: ts(),
  });
}

/* ─────────────────────────────────────────────
   Handler
───────────────────────────────────────────── */
exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  try {
    // 1. Verify signature with Svix (raw body REQUIRED)
    const wh = new Webhook(process.env.RESEND_WEBHOOK_SECRET);
    const payload = wh.verify(event.body, {
      'svix-id': event.headers['svix-id'],
      'svix-timestamp': event.headers['svix-timestamp'],
      'svix-signature': event.headers['svix-signature'],
    });

    if (payload.type !== 'email.received') {
      return { statusCode: 200, body: 'Ignored: ' + payload.type };
    }

    initFirebase();

    const emailId = payload.data.email_id;
    if (!emailId) {
      console.error('No email_id in payload');
      return { statusCode: 200, body: 'No email id' };
    }

    // 2. Fetch full content — webhook only has metadata
    const { data: email, error } = await resend.emails.receiving.get(emailId);
    if (error || !email) {
      console.error('Failed to fetch email:', error);
      return { statusCode: 500, body: 'Fetch failed' };
    }

    const messageId = email.message_id || `<${emailId}@resend>`;

    // 3. Match to existing ticket
    const ticketRef = await matchTicket(email);

    if (!ticketRef) {
      // New ticket
      const { ref, ticket } = await createTicketFromEmail(email, messageId);
      try { await sendAutoAcknowledgement({ ...ticket, ref }); }
      catch (e) { console.error('Auto-ack failed:', e.message); }
      console.log(`✓ Created ticket ${ref} from ${email.from}`);
    } else {
      // Existing ticket — append
      await appendToTicket(ticketRef.id, email, messageId);
      console.log(`✓ Appended to ticket ${ticketRef.id}`);
    }

    return { statusCode: 200, body: 'OK' };
  } catch (err) {
    console.error('Inbound email error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
