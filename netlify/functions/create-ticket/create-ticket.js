const { FieldValue } = require('firebase-admin/firestore');
const { initAdmin } = require('../_lib/auth');

function headers(event) {
  const origin = event.headers?.origin || event.headers?.Origin || '';
  const allowed = String(process.env.ALLOWED_ORIGINS || '').split(',').map((x) => x.trim()).filter(Boolean);
  return {
    'Access-Control-Allow-Origin': allowed.length && allowed.includes(origin) ? origin : (allowed[0] || origin || '*'),
    'Vary': 'Origin',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };
}
const json = (status, body, event) => ({ statusCode: status, headers: headers(event), body: JSON.stringify(body) });
const clean = (value, max = 500) => String(value || '').trim().slice(0, max);

// Public, unauthenticated endpoint: anyone can call this (it's the walk-in / no-login
// ticket intake). It must never trust the caller for anything beyond the ticket content
// itself - no role, no priority, no status, no ticket ref. All of that is decided here.
exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: headers(event), body: '' };
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' }, event);

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return json(400, { error: 'Invalid request body.' }, event);
  }

  // Honeypot: a hidden field real visitors never see or fill. Bots that fill every
  // field get a generic success response (so scrapers can't tell they were caught)
  // but nothing is written.
  if (clean(body.website, 200)) {
    return json(200, { success: true, ticketRef: 'CIM-0000' }, event);
  }

  // Basic anti-bot timing check: the form sends the timestamp it was rendered at.
  // A real person takes at least a few seconds to fill this in.
  const renderedAt = Number(body.renderedAt || 0);
  if (renderedAt && Date.now() - renderedAt < 3000) {
    return json(429, { error: 'Please try submitting again.' }, event);
  }

  const clientName = clean(body.clientName, 140);
  const phone = clean(body.phone, 40);
  const email = clean(body.email, 200);
  const company = clean(body.company, 140);
  const serviceCategory = clean(body.serviceCategory, 60);
  const serviceCategoryLabel = clean(body.serviceCategoryLabel, 140);
  const serviceSubCategory = clean(body.serviceSubCategory, 60);
  const serviceSubCategoryLabel = clean(body.serviceSubCategoryLabel, 140);
  const issueTitle = clean(body.issueTitle, 240);
  const issueDetail = clean(body.issueDetail, 6000);
  const address = clean(body.address, 500);
  const channels = Array.isArray(body.channels) ? body.channels.filter((c) => ['whatsapp', 'email'].includes(c)).slice(0, 2) : [];
  const deviceType = clean(body.deviceType, 100);
  const manufacturer = clean(body.manufacturer, 100);
  const modelNumber = clean(body.modelNumber, 100);
  const serialNumber = clean(body.serialNumber, 100);

  if (!clientName) return json(400, { error: 'Full name is required.' }, event);
  if (!phone) return json(400, { error: 'A phone / WhatsApp number is required.' }, event);
  if (!serviceCategory || !serviceSubCategory) return json(400, { error: 'Select a service category and specific requirement.' }, event);
  if (!issueTitle) return json(400, { error: 'Add a short issue or request title.' }, event);
  if (!channels.length) return json(400, { error: 'Select at least one communication channel.' }, event);

  try {
    const { db } = initAdmin();
    const counter = db.collection('meta').doc('counter');
    const ticketDoc = db.collection('tickets').doc();
    let ref;
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(counter);
      const current = snap.exists && Number.isInteger(snap.data().val) ? snap.data().val : 1000;
      const next = current + 1;
      ref = `CIM-${String(next).padStart(4, '0')}`;
      tx.set(counter, { val: next, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
      tx.set(ticketDoc, {
        ref,
        ticketNumber: ref,
        clientName,
        name: clientName,
        company,
        phone,
        email,
        serviceCategory,
        serviceCategoryLabel,
        serviceSubCategory,
        serviceSubCategoryLabel,
        serviceType: serviceCategory,
        channels,
        contactMethod: channels[0],
        issueTitle,
        issueDetail,
        problemDescription: issueDetail,
        address,
        deviceType,
        manufacturer,
        modelNumber,
        serialNumber,
        priority: 'medium',
        status: 'open',
        assignedEngineer: 'Unassigned',
        notes: [],
        quotationRef: '',
        parts: [],
        attachments: [],
        loggedBy: 'customer',
        source: 'public-intake',
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    });
    return json(200, { success: true, ticketRef: ref }, event);
  } catch (error) {
    console.error('create-ticket error', error);
    return json(500, { error: 'Could not create your ticket. Please try again or contact us directly.' }, event);
  }
};
