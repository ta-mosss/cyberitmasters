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
  'open', 'assigned', 'in_progress', 'in-progress', 'on_hold', 'on-hold',
  'awaiting_customer', 'awaiting-customer', 'awaiting_parts', 'awaiting-parts',
  'awaiting_authorisation', 'awaiting-authorisation', 'resolved', 'awaiting-signoff', 'closed',
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
    ['tickets', query(collection(db, 'tickets'), limit(500))],
    ['jobs', query(collection(db, 'jobs'), limit(500))],
    ['engineers', query(collection(db, 'users'), limit(500))],
    ['customers', query(collection(db, 'customers'), limit(500))],
    ['assets', query(collection(db, 'assets'), limit(500))],
    ['quotes', query(collection(db, 'quotes'), limit(500))],
    ['auditLogs', query(collection(db, 'auditLogs'), orderBy('createdAt', 'desc'), limit(250))],
  ];

  const unsubs = sources.map(([key, source]) => onSnapshot(
    source,
    (snapshot) => {
      let rows = mapSnapshot(snapshot);
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
