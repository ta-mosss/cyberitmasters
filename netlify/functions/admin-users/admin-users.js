const { FieldValue } = require('firebase-admin/firestore');
const { verifyStaff } = require('../_lib/auth');

const ROLES = new Set([
  'super_admin','operations_manager','service_manager','dispatcher',
  'finance','engineer','support_agent','customer'
]);

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, body: '' };
  try {
    const staff = await verifyStaff(event);
    if (staff.role !== 'super_admin') {
      return { statusCode: 403, body: JSON.stringify({ error: 'Super administrator access required.' }) };
    }

    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed.' }) };
    }

    const body = JSON.parse(event.body || '{}');
    const uid = String(body.uid || '').trim();
    const role = String(body.role || '').trim();
    const active = Boolean(body.active);

    if (!uid || !ROLES.has(role)) {
      return { statusCode: 400, body: JSON.stringify({ error: 'uid and a valid role are required.' }) };
    }

    const target = await staff.auth.getUser(uid);
    const currentClaims = target.customClaims || {};
    await staff.auth.setCustomUserClaims(uid, { ...currentClaims, role, active });
    await staff.auth.revokeRefreshTokens(uid);

    await staff.db.collection('users').doc(uid).set({
      role,
      active,
      updatedAt: FieldValue.serverTimestamp(),
      authClaimsUpdatedAt: FieldValue.serverTimestamp(),
      authClaimsRevokedAt: FieldValue.serverTimestamp(),
    }, { merge: true });

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        uid,
        role,
        active,
        message: 'Role/activation updated. Existing refresh tokens were revoked; the user must authenticate again.'
      })
    };
  } catch (error) {
    console.error('admin-users error:', error);
    return { statusCode: error.statusCode || 500, body: JSON.stringify({ error: error.message || 'Internal server error.' }) };
  }
};
