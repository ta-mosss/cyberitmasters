const crypto = require('crypto');
const { FieldValue, Timestamp } = require('firebase-admin/firestore');
const { initAdmin, bearer, verifyStaff } = require('../_lib/auth');

const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function headers(event) {
  const origin = event.headers?.origin || event.headers?.Origin || '';
  const allowed = String(process.env.ALLOWED_ORIGINS || '').split(',').map(x => x.trim()).filter(Boolean);
  const allowOrigin = allowed.length ? (allowed.includes(origin) ? origin : allowed[0]) : origin || '*';
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Vary': 'Origin',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json',
  };
}
function json(statusCode, body, event) { return { statusCode, headers: headers(event), body: JSON.stringify(body) }; }
function sha256(value) { return crypto.createHash('sha256').update(value).digest('hex'); }
function randomToken() { return crypto.randomBytes(32).toString('base64url'); }
function validatePngDataUrl(value, maxChars = 350000) {
  const input = String(value || '').trim();
  if (!input || input.length > maxChars) return null;
  if (!/^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/.test(input)) return null;
  return input;
}
function publicTicket(data, id) {
  const safe = {};
  const keys = ['ref','ticketNumber','clientName','name','company','phone','email','address','deviceType','manufacturer','modelNumber','serialNumber','operatingSystem','serviceCategoryLabel','serviceSubCategoryLabel','issueTitle','issueDetail','problemDescription','priority','status','assignedEngineer','preferredDate','preferredTime'];
  for (const key of keys) if (data[key] !== undefined) safe[key] = data[key];
  safe.id = id;
  return safe;
}
async function getTicketByToken(db, token) {
  if (!token || token.length < 32) throw Object.assign(new Error('Invalid sign-off link.'), { statusCode: 401 });
  const hash = sha256(token);
  const snap = await db.collection('tickets').where('signoffTokenHash', '==', hash).limit(1).get();
  if (snap.empty) throw Object.assign(new Error('Invalid or expired sign-off link.'), { statusCode: 401 });
  const doc = snap.docs[0];
  const data = doc.data();
  const expires = data.signoffTokenExpiresAt?.toMillis?.() || Date.parse(data.signoffTokenExpiresAt || '') || 0;
  if (!expires || Date.now() > expires || data.status === 'closed' || data.signoffUsedAt) {
    throw Object.assign(new Error('This sign-off link is expired or has already been used.'), { statusCode: 410 });
  }
  return { ref: doc.id, refDoc: doc.ref, data };
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: headers(event), body: '' };
  try {
    const { db } = initAdmin();
    const url = new URL(event.rawUrl || `https://local/.netlify/functions/authorise${event.rawQuery ? `?${event.rawQuery}` : ''}`);
    const token = url.searchParams.get('token');

    // Public validation endpoint for the one-time customer sign-off link.
    if (event.httpMethod === 'GET') {
      const result = await getTicketByToken(db, token);
      if (!['resolved','awaiting-signoff'].includes(result.data.status)) {
        return json(409, { error: 'Ticket is not currently ready for sign-off.' }, event);
      }
      return json(200, { success: true, ticket: publicTicket(result.data, result.ref) }, event);
    }

    if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' }, event);
    const body = JSON.parse(event.body || '{}');
    const mode = body.mode || 'customer-signoff';

    // Staff-only action: generate a one-time customer sign-off URL.
    if (mode === 'create-link') {
      const staff = await verifyStaff(event);
      const ticketId = String(body.ticketId || '').trim();
      if (!ticketId) return json(400, { error: 'ticketId is required.' }, event);
      const ref = staff.db.collection('tickets').doc(ticketId);
      const snap = await ref.get();
      if (!snap.exists) return json(404, { error: 'Ticket not found.' }, event);
      const ticket = snap.data();
      const canIssue = staff.role === 'super_admin' || ['operations_manager','service_manager','dispatcher','support_agent'].includes(staff.role) ||
        (staff.role === 'engineer' && (ticket.assignedEngineerId === staff.decoded.uid || ticket.assignedUid === staff.decoded.uid));
      if (!canIssue) return json(403, { error: 'You are not authorised to request sign-off for this ticket.' }, event);
      if (!['resolved','awaiting-signoff'].includes(ticket.status)) return json(409, { error: 'Ticket must be resolved before requesting client sign-off.' }, event);
      const raw = randomToken();
      const expiresAt = Timestamp.fromMillis(Date.now() + TOKEN_TTL_MS);
      await ref.update({
        status: 'awaiting-signoff',
        signoffTokenHash: sha256(raw),
        signoffTokenExpiresAt: expiresAt,
        signoffRequestedAt: FieldValue.serverTimestamp(),
        signoffRequestedByUid: staff.decoded.uid,
        signoffRequestedByEmail: staff.decoded.email || null,
        updatedAt: FieldValue.serverTimestamp(),
      });
      const origin = process.env.SIGNOFF_BASE_URL || `${event.headers?.origin || ''}`;
      const base = origin.replace(/\/$/, '');
      const path = process.env.SIGNOFF_PATH || '/signoff';
      const link = `${base}${path}?ticketId=${encodeURIComponent(ticketId)}&token=${encodeURIComponent(raw)}`;
      return json(200, { success: true, link, expiresAt: expiresAt.toDate().toISOString() }, event);
    }

    // Staff-authorised sign-off from the internal portal.
    if (mode === 'staff-signoff') {
      const staff = await verifyStaff(event);
      const ticketId = String(body.ticketId || '').trim();
      const name = String(body.name || '').trim();
      const signature = String(body.signature || '').trim();
      if (!ticketId || !name || !signature) return json(400, { error: 'ticketId, name and signature are required.' }, event);
      const ref = staff.db.collection('tickets').doc(ticketId);
      await staff.db.runTransaction(async tx => {
        const snap = await tx.get(ref);
        if (!snap.exists) throw Object.assign(new Error('Ticket not found.'), { statusCode: 404 });
        const ticket = snap.data();
        const assignedEngineer = ticket.assignedEngineerId || ticket.assignedUid;
        const isAssignedEngineer = staff.role === 'engineer' && assignedEngineer === staff.decoded.uid;
        const isManager = ['super_admin','operations_manager','service_manager','dispatcher'].includes(staff.role);
        if (!isManager && !isAssignedEngineer) {
          throw Object.assign(new Error('Only management or the assigned engineer may record staff authorisation.'), { statusCode: 403 });
        }
        if (!['resolved','awaiting-signoff'].includes(ticket.status)) {
          throw Object.assign(new Error('Ticket must be resolved or awaiting sign-off before authorisation.'), { statusCode: 409 });
        }
        const safeSignature = validatePngDataUrl(signature);
        if (!safeSignature) {
          throw Object.assign(new Error('Signature must be a valid PNG data URL.'), { statusCode: 400 });
        }
        if (ticket.status === 'closed') throw Object.assign(new Error('Ticket is already closed.'), { statusCode: 409 });
        tx.update(ref, {
          authorized: true,
          authorisationName: name.slice(0, 160),
          authorisationPosition: String(body.position || '').trim().slice(0, 160),
          authorisationSignature: safeSignature,
          authorisationSignedAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
      });
      return json(200, { success: true }, event);
    }

    // Customer sign-off: possession of the unguessable, expiring one-time token
    // is the authorisation mechanism. No customer Firebase session is required.
    const result = await getTicketByToken(db, String(body.token || token || ''));
    if (body.ticketId && String(body.ticketId) !== result.ref) {
      return json(409, { error: 'Ticket reference does not match the sign-off link.' }, event);
    }
    const signoff = {
      signed: true,
      signedAt: FieldValue.serverTimestamp(),
      clientName: String(body.clientName || result.data.clientName || result.data.name || 'Client').trim().slice(0, 160),
      clientPosition: String(body.clientPosition || '').trim().slice(0, 160),
      signatureImage: validatePngDataUrl(body.signature),
      feedback: {
        q1_resolved: String(body.q1_resolved || ''),
        q2_timeframe: String(body.q2_timeframe || ''),
        q3_tasks: String(body.q3_tasks || ''),
        remaining_issues: String(body.remaining_issues || '').slice(0, 4000),
        serviceRating: Number(body.serviceRating || 0),
        engineerRating: Number(body.engineerRating || 0),
        npsScore: Number(body.npsScore || 0),
        comments: String(body.comments || '').slice(0, 6000),
        timestamp: FieldValue.serverTimestamp(),
      },
    };
    if (!signoff.signatureImage) {
      return json(400, { error: 'Signature must be a valid PNG data URL.' }, event);
    }
    await db.runTransaction(async tx => {
      const snap = await tx.get(result.refDoc);
      if (!snap.exists) throw Object.assign(new Error('Ticket not found.'), { statusCode: 404 });
      const current = snap.data();
      const expires = current.signoffTokenExpiresAt?.toMillis?.() || 0;
      if (current.signoffTokenHash !== sha256(String(body.token || token || '')) || current.signoffUsedAt || !expires || Date.now() > expires || current.status === 'closed') {
        throw Object.assign(new Error('This sign-off link is invalid, expired, or already used.'), { statusCode: 409 });
      }
      if (!['resolved','awaiting-signoff'].includes(current.status)) throw Object.assign(new Error('Ticket is not ready for sign-off.'), { statusCode: 409 });
      tx.update(result.refDoc, {
        status: 'closed',
        clientSignoff: signoff,
        satisfaction: signoff.feedback.q1_resolved,
        serviceRating: signoff.feedback.serviceRating,
        engineerRating: signoff.feedback.engineerRating,
        npsScore: signoff.feedback.npsScore,
        clientFeedback: signoff.feedback.comments,
        closedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        signoffUsedAt: FieldValue.serverTimestamp(),
        signoffTokenHash: FieldValue.delete(),
        signoffTokenExpiresAt: FieldValue.delete(),
      });
      const auditRef = db.collection('client_signoffs').doc();
      tx.create(auditRef, { ticketRef: result.ref, ...signoff, status: 'closed_via_portal', createdAt: FieldValue.serverTimestamp() });
    });
    return json(200, { success: true, message: 'Client sign-off recorded and ticket closed.' }, event);
  } catch (error) {
    console.error('authorise error:', error);
    return json(error.statusCode || 500, { error: error.message || 'Internal server error.' }, event);
  }
};
