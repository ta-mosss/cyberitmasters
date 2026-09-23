const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore');

const STAFF_ROLES = new Set([
  'super_admin','operations_manager','service_manager','dispatcher','finance','engineer','support_agent'
]);
const MANAGER_ROLES = new Set(['super_admin','operations_manager','service_manager','dispatcher']);

function initAdmin() {
  if (!getApps().length) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    initializeApp({ credential: cert(serviceAccount), projectId: process.env.FIREBASE_PROJECT_ID });
  }
  return { auth: getAuth(), db: getFirestore() };
}

function bearer(event) {
  const value = event.headers?.authorization || event.headers?.Authorization || '';
  const match = /^Bearer\s+(.+)$/i.exec(value);
  return match ? match[1] : null;
}

async function verifyStaff(event, { managersOnly = false } = {}) {
  const { auth, db } = initAdmin();
  const token = bearer(event);
  if (!token) throw Object.assign(new Error('Authentication required.'), { statusCode: 401 });
  const decoded = await auth.verifyIdToken(token, true);
  const snap = await db.collection('users').doc(decoded.uid).get();
  const profile = snap.exists ? snap.data() : {};
  const role = profile.role || decoded.role || (decoded.admin ? 'super_admin' : null);
  if (profile.active === false) throw Object.assign(new Error('Staff account is disabled.'), { statusCode: 403 });
  if (!STAFF_ROLES.has(role) || (managersOnly && !MANAGER_ROLES.has(role))) {
    throw Object.assign(new Error('Insufficient staff permissions.'), { statusCode: 403 });
  }
  return { auth, db, decoded, profile, role };
}

module.exports = { initAdmin, bearer, verifyStaff, STAFF_ROLES, MANAGER_ROLES };
