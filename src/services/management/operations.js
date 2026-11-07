import {
  addDoc,
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import { auth, db, assertFirebase } from '../firebase/app';

export const MANAGEMENT_TICKET_STATUSES = [
  'open', 'new', 'assigned', 'in-progress', 'on-hold',
  'awaiting-customer', 'awaiting-parts', 'scheduled', 'en-route', 'onsite',
  'pending', 'awaiting-authorisation', 'awaiting-payment', 'quoted',
  'resolved', 'awaiting-signoff', 'closed',
];

export const MANAGEMENT_JOB_STATUSES = [
  'scheduled', 'dispatched', 'en-route', 'onsite', 'in-progress', 'awaiting-parts', 'completed', 'cancelled',
];

export const MANAGEMENT_NAV = [
  { key: 'dashboard', label: 'Operations', icon: '◈' },
  { key: 'tickets', label: 'Service Desk', icon: '🎫' },
  { key: 'jobs', label: 'Job Cards', icon: '🧰' },
  { key: 'dispatch', label: 'Dispatch', icon: '🚐' },
  { key: 'engineers', label: 'Engineers', icon: '👷' },
  { key: 'customers', label: 'Customers', icon: '🏢' },
  { key: 'assets', label: 'Assets', icon: '💻' },
  { key: 'quotes', label: 'Quotes & Invoices', icon: '💳' },
  { key: 'sla', label: 'SLA & Escalations', icon: '⏱' },
  { key: 'reports', label: 'Reports', icon: '📊' },
  { key: 'audit', label: 'Audit Log', icon: '🧾' },
  { key: 'staff', label: 'Staff & Access', icon: '🔑' },
  { key: 'settings', label: 'Settings', icon: '⚙' },
];

const STAFF_ROLES = new Set([
  'super_admin', 'operations_manager', 'service_manager', 'dispatcher', 'finance', 'engineer', 'support_agent',
]);

export function isManagementRole(role) {
  return ['super_admin', 'operations_manager', 'service_manager', 'dispatcher'].includes(role);
}

export function isFinanceRole(role) {
  return role === 'finance';
}

function mapSnapshot(snapshot) {
  return snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() }));
}

export function subscribeToOperationsData(callbacks, onError) {
  assertFirebase();
  const sources = [
    ['tickets', query(collection(db, 'tickets'), orderBy('updatedAt', 'desc'), limit(500))],
    ['jobs', query(collection(db, 'jobs'), orderBy('updatedAt', 'desc'), limit(500))],
    ['engineers', query(collection(db, 'users'), orderBy('updatedAt', 'desc'), limit(500))],
    ['customers', query(collection(db, 'customers'), orderBy('updatedAt', 'desc'), limit(500))],
    ['assets', query(collection(db, 'assets'), orderBy('updatedAt', 'desc'), limit(500))],
    ['quotes', query(collection(db, 'quotes'), orderBy('updatedAt', 'desc'), limit(500))],
    ['auditLogs', query(collection(db, 'auditLogs'), orderBy('createdAt', 'desc'), limit(250))],
  ];

  const unsubs = sources.map(([key, source]) => onSnapshot(
    source,
    (snapshot) => {
      let rows = mapSnapshot(snapshot);
      if (snapshot.size === 500) console.warn(`[management] ${key} feed reached the 500-row live window; use reporting/export pagination for older records.`);
      if (key === 'engineers') rows = rows.filter((person) => STAFF_ROLES.has(person.role) && person.role !== 'customer');
      callbacks[key]?.(rows);
    },
    (error) => onError?.(key, error),
  ));

  return () => unsubs.forEach((unsubscribe) => unsubscribe());
}

export async function updateManagementTicket(ticket, changes, actor) {
  assertFirebase();
  const batch = writeBatch(db);
  batch.update(doc(db, 'tickets', ticket.id), { ...changes, updatedAt: serverTimestamp() });
  batch.set(doc(collection(db, 'auditLogs')), {
    action: 'ticket.updated',
    ticketRef: ticket.ref || ticket.ticketNumber || ticket.id,
    ticketId: ticket.id,
    actor: actor?.email || actor?.uid || 'management',
    actorUid: actor?.uid || null,
    actorRole: actor?.role || null,
    details: changes,
    createdAt: serverTimestamp(),
  });
  await batch.commit();
}

export async function appendManagementNote(ticket, text, actor) {
  const clean = String(text || '').trim();
  if (!clean) return null;
  const note = {
    id: crypto.randomUUID(),
    txt: clean.slice(0, 6000),
    author: actor?.email || actor?.displayName || 'Management',
    authorId: actor?.uid || null,
    at: new Date().toISOString(),
    source: 'management',
  };
  const notes = [...(Array.isArray(ticket.notes) ? ticket.notes : []), note];
  await updateManagementTicket(ticket, { notes }, actor);
  return note;
}

export async function updateManagementJob(job, changes, actor) {
  assertFirebase();
  const batch = writeBatch(db);
  batch.update(doc(db, 'jobs', job.id), { ...changes, updatedAt: serverTimestamp() });
  batch.set(doc(collection(db, 'auditLogs')), {
    action: 'job.updated',
    jobNumber: job.jobNumber || job.id,
    jobId: job.id,
    ticketRef: job.ticketRef || null,
    actor: actor?.email || actor?.uid || 'management',
    actorUid: actor?.uid || null,
    actorRole: actor?.role || null,
    details: changes,
    createdAt: serverTimestamp(),
  });
  await batch.commit();
}

export async function createJobCard(payload) {
  assertFirebase();
  const current = auth?.currentUser;
  if (!current) throw new Error('Your session has expired. Please sign in again.');
  const token = await current.getIdToken();
  const response = await fetch('/.netlify/functions/create-job', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.success) throw new Error(result.error || 'Could not create job card.');
  return result;
}

// Sends email through the app's own secured backend (Resend) so staff never
// have to leave the app for Gmail/Outlook/Zoho. Scoped to one ticket by
// design: the function only allows sending to that ticket's own contact
// email or an internal staff address, which is what keeps this from being an
// open mail relay. A true send-to-anyone composer would need a separate,
// more heavily rate-limited endpoint - ask if that's actually needed.
export async function sendTicketEmail({ ticketId, to, subject, body }) {
  assertFirebase();
  const current = auth?.currentUser;
  if (!current) throw new Error('Your session has expired. Please sign in again.');
  const token = await current.getIdToken();
  const response = await fetch('/.netlify/functions/send-ticket-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ ticketId, to, subject, body }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.success) throw new Error(result.error || 'Could not send email.');
  return result;
}

export const STATUS_EMAIL_TEMPLATES = {
  'open': { label: 'Acknowledged', subject: (t) => `We've received your ticket ${t.ref || ''}`, body: (t) => `Hi ${t.clientName || t.name || 'there'},\n\nThanks for reaching out. We've logged your request "${t.issueTitle || ''}" under reference ${t.ref || ''} and a technician will be in touch shortly.\n\n— Cyber I.T Masters` },
  'in-progress': { label: 'Work started', subject: (t) => `Update on ticket ${t.ref || ''}`, body: (t) => `Hi ${t.clientName || t.name || 'there'},\n\nJust letting you know we've started working on ticket ${t.ref || ''} ("${t.issueTitle || ''}"). We'll update you again once there's progress to share.\n\n— Cyber I.T Masters` },
  'awaiting-customer': { label: 'Need more info', subject: (t) => `We need a bit more information - ${t.ref || ''}`, body: (t) => `Hi ${t.clientName || t.name || 'there'},\n\nTo continue with ticket ${t.ref || ''}, we need some more information from you. Please reply here or WhatsApp us with the details.\n\n— Cyber I.T Masters` },
  'awaiting-parts': { label: 'Awaiting parts', subject: (t) => `Update on ticket ${t.ref || ''} - awaiting parts`, body: (t) => `Hi ${t.clientName || t.name || 'there'},\n\nWe're currently waiting on parts for ticket ${t.ref || ''}. We'll notify you as soon as they arrive and work can continue.\n\n— Cyber I.T Masters` },
  'resolved': { label: 'Resolved', subject: (t) => `Your ticket ${t.ref || ''} has been resolved`, body: (t) => `Hi ${t.clientName || t.name || 'there'},\n\nGood news - ticket ${t.ref || ''} ("${t.issueTitle || ''}") has been resolved. Please let us know if anything else comes up.\n\n— Cyber I.T Masters` },
  'closed': { label: 'Closed', subject: (t) => `Your ticket ${t.ref || ''} is now closed`, body: (t) => `Hi ${t.clientName || t.name || 'there'},\n\nTicket ${t.ref || ''} has now been closed. Thank you for choosing Cyber I.T Masters - reach out any time if you need us again.\n\n— Cyber I.T Masters` },
};

// Staff administration runs through the CIMOP Team & Access Worker (Cloudflare),
// which is reachable from any origin it allows (Netlify domain and GitHub Pages).
const TEAM_ADMIN_URL = import.meta.env.VITE_TEAM_ADMIN_URL || 'https://cimop-portal-auth.mosesanza.workers.dev/';

export async function teamAdminRequest(action, payload = {}) {
  assertFirebase();
  const current = auth?.currentUser;
  if (!current) throw new Error('Your session has expired. Please sign in again.');
  const token = await current.getIdToken(true);
  const response = await fetch(TEAM_ADMIN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ action, ...payload }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || result.ok === false || result.success === false) {
    throw new Error(result.message || result.error || 'Team administration request failed.');
  }
  return result;
}

export async function createAuditEntry(payload) {
  assertFirebase();
  await addDoc(collection(db, 'auditLogs'), { ...payload, createdAt: serverTimestamp() });
}

export function statusTone(status) {
  const value = String(status || '').toLowerCase();
  if (/closed|resolved|completed|paid|complete/.test(value)) return 'good';
  if (/urgent|overdue|breached|cancel/.test(value)) return 'danger';
  if (/at-risk|risk|awaiting|pending|scheduled|assigned/.test(value)) return 'warn';
  return 'info';
}

export function toDateValue(value) {
  if (!value) return null;
  if (typeof value?.toDate === 'function') return value.toDate();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDate(value) {
  const date = toDateValue(value);
  return date ? date.toLocaleString() : '—';
}

export function displayCustomer(ticket) {
  return ticket?.company || ticket?.clientName || ticket?.name || ticket?.customerName || '—';
}

export function displayEngineer(person) {
  return person?.displayName || person?.name || person?.fullName || person?.email || 'Unassigned';
}
