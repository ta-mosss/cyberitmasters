import {
  createUserWithEmailAndPassword,
  getIdTokenResult,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from './app';
import { saveCustomerProfile } from '../tickets/customer';

export const subscribeToAuth = (callback) => {
  if (!auth) return () => {};
  return onAuthStateChanged(auth, callback);
};

export async function signIn(email, password) {
  if (!auth) throw new Error('Firebase authentication is unavailable.');
  const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
  return resolveUserContext(credential.user);
}

export async function signUpCustomer({ email, password, name, company, phone }) {
  if (!auth) throw new Error('Firebase authentication is unavailable.');
  const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
  await updateProfile(credential.user, { displayName: name.trim() });
  await saveCustomerProfile(credential.user.uid, {
    name: name.trim(),
    company: company.trim(),
    phone: phone.trim(),
    email: email.trim().toLowerCase(),
  });
  return resolveUserContext(credential.user);
}

export async function resetPassword(email) {
  if (!auth) throw new Error('Firebase authentication is unavailable.');
  await sendPasswordResetEmail(auth, email.trim());
}

export async function signOut() {
  if (!auth) return;
  await firebaseSignOut(auth);
}

export async function resolveUserContext(user) {
  if (!user) return null;

  let claims = {};
  try {
    claims = (await getIdTokenResult(user, false)).claims ?? {};
  } catch {
    // Firestore role/profile can still be used while claims are prepared.
  }

  let profile = null;
  let customerProfile = null;
  if (db) {
    try {
      const snap = await getDoc(doc(db, 'users', user.uid));
      profile = snap.exists() ? snap.data() : null;
    } catch {
      profile = null;
    }
    try {
      const snap = await getDoc(doc(db, 'customers', user.uid));
      customerProfile = snap.exists() ? snap.data() : null;
    } catch {
      customerProfile = null;
    }
  }

  const claimRoles = Array.isArray(claims.roles)
    ? claims.roles
    : claims.role
      ? [claims.role]
      : [];

  const profileRoles = Array.isArray(profile?.roles)
    ? profile.roles
    : profile?.role
      ? [profile.role]
      : [];

  const roles = [...new Set([...claimRoles, ...profileRoles].filter(Boolean))];
  if (!roles.length && customerProfile) roles.push('customer');
  const role = roles[0] || null;

  return {
    user,
    claims,
    profile,
    customerProfile,
    roles,
    role,
    isStaff: roles.some((value) => STAFF_ROLES.has(value)),
    isManagement: roles.some((value) => MANAGEMENT_ROLES.has(value)),
  };
}

export const STAFF_ROLES = new Set([
  'super_admin',
  'operations_manager',
  'service_manager',
  'dispatcher',
  'finance',
  'engineer',
  'support_agent',
]);

export const MANAGEMENT_ROLES = new Set([
  'super_admin',
  'operations_manager',
  'service_manager',
  'dispatcher',
  'finance',
]);
