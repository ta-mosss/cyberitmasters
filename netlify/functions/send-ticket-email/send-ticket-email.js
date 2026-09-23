const { FieldValue } = require('firebase-admin/firestore');
const { getStorage } = require('firebase-admin/storage');
const { Resend } = require('resend');
const { verifyStaff } = require('../_lib/auth');

function cleanHtml(value) {
  return String(value || '')
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/\\son[a-z]+\\s*=\\s*(?:"[^"]*"|'[^']*'|[^\\s>]+)/gi, '')
    .replace(/javascript:/gi, '');
}
function normaliseEmail(value) {
  const match = String(value || '').match(/<([^>]+)>/);
  return (match ? match[1] : String(value || '')).trim().toLowerCase();
}
function response(event, statusCode, body) {
  const origin = event.headers?.origin || event.headers?.Origin || '';
  const allowed = String(process.env.ALLOWED_ORIGINS || '').split(',').map(x => x.trim()).filter(Boolean);
  const allowOrigin = allowed.length ? (allowed.includes(origin) ? origin : allowed[0]) : origin || '*';
  return { statusCode, headers: { 'Access-Control-Allow-Origin': allowOrigin, 'Vary': 'Origin', 'Access-Control-Allow-Headers': 'Content-Type, Authorization', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Content-Type': 'application/json' }, body: JSON.stringify(body) };
}
exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return response(event, 204, {});
  if (event.httpMethod !== 'POST') return response(event, 405, { error: 'Method not allowed' });
  try {
    const staff = await verifyStaff(event);
    const { ticketId, to, subject, body, attachments = [] } = JSON.parse(event.body || '{}');
    if (!ticketId || !to || !body) return response(event, 400, { error: 'ticketId, to and body are required.' });
    const recipient = normaliseEmail(to);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) return response(event, 400, { error: 'Invalid recipient email.' });

    const ticketRef = staff.db.collection('tickets').doc(ticketId);
    const ticketSnap = await ticketRef.get();
    if (!ticketSnap.exists) return response(event, 404, { error: 'Ticket not found.' });
    const ticketData = ticketSnap.data();
    const allowedRecipients = new Set([
      normaliseEmail(ticketData.email),
      normaliseEmail(ticketData.requesterEmail),
      normaliseEmail(ticketData.contactEmail),
    ].filter(Boolean));
    const internalDomain = String(process.env.INTERNAL_EMAIL_DOMAIN || 'mbulahenigroup.co.za').toLowerCase();
    if (!allowedRecipients.has(recipient) && !recipient.endsWith(`@${internalDomain}`)) {
      return response(event, 403, { error: 'Recipient is not associated with this ticket.' });
    }

    const resend = new Resend(process.env.RESEND_API_KEY);
    const thread = Array.isArray(ticketData.emailThread) ? ticketData.emailThread : [];
    const replyTo = `tickets+${ticketId}@${process.env.TICKETS_DOMAIN}`;
    const sendPayload = {
      from: process.env.TICKETS_FROM_EMAIL,
      to: recipient,
      subject: subject || `Re: ${ticketData.subject || ticketData.issueTitle || 'Your ticket'}`,
      html: cleanHtml(body),
      replyTo,
    };
    const lastMessageId = thread.length ? thread[thread.length - 1].messageId : null;
    if (lastMessageId) sendPayload.headers = { 'In-Reply-To': lastMessageId, References: thread.map(m => m.messageId).filter(Boolean).join(' ') };

    // Only accept attachment descriptors that point to our own ticket storage path.
    const safeAttachments = (Array.isArray(attachments) ? attachments : []).filter(a => a && typeof a.path === 'string' && a.path.startsWith(`tickets/${ticketId}/emailAttachments/`)).slice(0, 10);
    if (safeAttachments.length) {
      const bucket = getStorage().bucket();
      const providerAttachments = [];
      for (const attachment of safeAttachments) {
        const file = bucket.file(attachment.path);
        const [exists] = await file.exists();
        if (!exists) continue;
        const [bytes] = await file.download();
        providerAttachments.push({
          filename: String(attachment.name || attachment.path.split('/').pop()).slice(0, 180),
          content: bytes.toString('base64'),
        });
      }
      if (providerAttachments.length) sendPayload.attachments = providerAttachments;
    }

    const { data, error } = await resend.emails.send(sendPayload);
    if (error) throw new Error(error.message);
    const entry = {
      direction: 'outbound', messageId: data.id, from: process.env.TICKETS_FROM_EMAIL, to: recipient,
      subject: sendPayload.subject, body: sendPayload.html, sentAt: new Date().toISOString(),
      sentByUid: staff.decoded.uid, sentByEmail: staff.decoded.email || null, sentByRole: staff.role,
    };
    await ticketRef.update({
      emailThread: [...thread, entry],
      emailMessageIds: [...(ticketData.emailMessageIds || []), data.id],
      updatedAt: FieldValue.serverTimestamp(),
    });
    await staff.db.collection('auditLogs').add({
      action: 'ticket_email_sent', ticketRef: ticketId, actorUid: staff.decoded.uid,
      actorEmail: staff.decoded.email || null, actorRole: staff.role, recipient: to,
      providerMessageId: data.id, createdAt: FieldValue.serverTimestamp(),
    });
    return response(event, 200, { success: true, messageId: data.id });
  } catch (error) {
    console.error('send-ticket-email error:', error);
    return response(event, error.statusCode || 500, { error: error.message || 'Internal server error.' });
  }
};
