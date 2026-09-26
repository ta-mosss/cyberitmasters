import {
  collection,
  doc,
  getDocs,
  limit,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { getDownloadURL, ref as storageRef, uploadBytes } from 'firebase/storage';
import { auth, db, storage, assertFirebase } from '../firebase/app';

export const ENGINEER_STATUSES = [
  'open',
  'assigned',
  'in-progress',
  'on-hold',
  'awaiting-customer',
  'awaiting-parts',
  'awaiting-authorisation',
  'resolved',
  'awaiting-signoff',
  'closed',
];

export const ENGINEER_STATUS_META = {
  open: { label: 'Open', tone: 'blue' },
  assigned: { label: 'Assigned', tone: 'green' },
  'in-progress': { label: 'In Progress', tone: 'blue' },
  'on-hold': { label: 'On Hold', tone: 'amber' },
  'awaiting-customer': { label: 'Awaiting Customer', tone: 'purple' },
  'awaiting-parts': { label: 'Awaiting Parts', tone: 'purple' },
  'awaiting-authorisation': { label: 'Awaiting Authorisation', tone: 'purple' },
  resolved: { label: 'Resolved', tone: 'slate' },
  'awaiting-signoff': { label: 'Awaiting Sign-Off', tone: 'orange' },
  closed: { label: 'Closed', tone: 'slate' },
};

export const ACTIVE_ENGINEER_STATUSES = ENGINEER_STATUSES.filter(
  (status) => !['resolved', 'closed'].includes(status),
);

function cleanTicket(snapshot) {
  return { id: snapshot.id, ...snapshot.data() };
}

export function subscribeToEngineerTickets(uid, engineerName, onChange, onError) {
  assertFirebase();
  const sources = [
    query(collection(db, 'tickets'), where('assignedEngineerId', '==', uid)),
  ];

  if (engineerName) {
    sources.push(query(collection(db, 'tickets'), where('assignedEngineer', '==', engineerName)));
  }

  const byId = new Map();
  const unsubs = sources.map((source) => onSnapshot(
    source,
    (snapshot) => {
      snapshot.docs.forEach((entry) => byId.set(entry.id, cleanTicket(entry)));
      const ordered = [...byId.values()].sort((a, b) => {
        const left = String(a.createdAt?.seconds ? a.createdAt.seconds : a.createdAt || '');
        const right = String(b.createdAt?.seconds ? b.createdAt.seconds : b.createdAt || '');
        return right.localeCompare(left);
      });
      onChange(ordered);
    },
    onError,
  ));

  return () => unsubs.forEach((unsubscribe) => unsubscribe());
}

export async function updateEngineerTicket(ticketId, changes) {
  assertFirebase();
  await updateDoc(doc(db, 'tickets', ticketId), {
    ...changes,
    updatedAt: serverTimestamp(),
  });
}

export async function appendEngineerNote(ticket, { text, engineerId, engineerName }) {
  assertFirebase();
  const nextNote = {
    id: crypto.randomUUID(),
    txt: text.trim(),
    author: engineerName,
    authorId: engineerId,
    at: new Date().toISOString(),
    source: 'engineer',
  };
  const notes = [...(Array.isArray(ticket.notes) ? ticket.notes : []), nextNote];
  await updateEngineerTicket(ticket.id, { notes });
  return nextNote;
}

export async function addEngineerTimeEntry(ticket, { engineerId, engineerName, startedAt, endedAt, minutes }) {
  assertFirebase();
  const ticketRef = doc(db, 'tickets', ticket.id);
  const entryRef = doc(collection(db, 'tickets', ticket.id, 'timeEntries'));
  const nextTotal = Number(ticket.timeSpentMinutes || 0) + Number(minutes || 0);

  const batch = writeBatch(db);
  batch.set(entryRef, {
    engineerId,
    engineerName,
    startedAt: startedAt || null,
    endedAt: endedAt || new Date().toISOString(),
    minutes: Number(minutes || 0),
    createdAt: serverTimestamp(),
  });
  batch.update(ticketRef, {
    timeSpentMinutes: nextTotal,
    workLastStoppedAt: serverTimestamp(),
    workStartedAt: null,
    updatedAt: serverTimestamp(),
  });
  await batch.commit();
  return nextTotal;
}

export async function uploadEngineerFiles(ticket, files, { engineerId, engineerName }) {
  assertFirebase();
  if (!storage) throw new Error('File storage is unavailable.');

  const selected = [...files].slice(0, 6);
  if (!selected.length) return ticket.attachments || [];

  for (const file of selected) {
    if (file.size > 5 * 1024 * 1024) {
      throw new Error(`${file.name} exceeds the 5 MB upload limit.`);
    }
  }

  const uploaded = [];
  for (const file of selected) {
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `ticket-attachments/${ticket.ref || ticket.id}/engineer/${Date.now()}-${safeName}`;
    const reference = storageRef(storage, path);
    await uploadBytes(reference, file, { contentType: file.type || 'application/octet-stream' });
    const url = await getDownloadURL(reference);
    uploaded.push({
      name: file.name,
      size: file.size,
      url,
      path,
      uploadedAt: new Date().toISOString(),
      uploadedBy: engineerId,
      uploadedByName: engineerName,
    });
  }

  const attachments = [...(Array.isArray(ticket.attachments) ? ticket.attachments : []), ...uploaded];
  await updateEngineerTicket(ticket.id, { attachments });
  return attachments;
}

export async function createCustomerSignoffLink(ticketId, signoffFunctionUrl) {
  assertFirebase();
  const current = auth?.currentUser;
  if (!current) throw new Error('Your session has expired. Please sign in again.');

  const token = await current.getIdToken(true);
  const response = await fetch(signoffFunctionUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ mode: 'create-link', ticketId }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.success) {
    throw new Error(result.error || 'Could not create secure sign-off link.');
  }
  return result;
}

