import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  query,
  setDoc,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { getDownloadURL, ref as storageRef, uploadBytes } from 'firebase/storage';
import { db, storage } from '../firebase/app';

const STATUS_ORDER = ['open', 'in-progress', 'awaiting-parts', 'awaiting-authorisation', 'awaiting-payment', 'quoted', 'resolved', 'awaiting-signoff', 'closed'];

export const STATUS_META = {
  open: { label: 'Open', tone: 'blue', icon: '●', description: 'Your request has been logged and is in our service queue.' },
  'in-progress': { label: 'In Progress', tone: 'amber', icon: '◐', description: 'An engineer is actively working on your request.' },
  'awaiting-parts': { label: 'Awaiting Parts', tone: 'purple', icon: '◇', description: 'Work is waiting for parts or equipment.' },
  'awaiting-authorisation': { label: 'Awaiting Authorisation', tone: 'purple', icon: '□', description: 'We are waiting for approval to proceed.' },
  'awaiting-payment': { label: 'Awaiting Payment', tone: 'purple', icon: '◌', description: 'We are waiting for payment before proceeding.' },
  quoted: { label: 'Quoted', tone: 'pink', icon: '◆', description: 'A quotation is ready for your review.' },
  resolved: { label: 'Resolved', tone: 'green', icon: '✓', description: 'Our team has marked the work as resolved.' },
  'awaiting-signoff': { label: 'Awaiting Sign-Off', tone: 'orange', icon: '✎', description: 'The work is ready for your review and sign-off.' },
  closed: { label: 'Closed', tone: 'slate', icon: '▣', description: 'This ticket has been closed.' },
};

export const SERVICE_CATALOG = [
  { id: 'managed-it', label: 'Managed IT Support', icon: '🛠️', description: 'Endpoints, printers, applications and users', items: [
    ['endpoint-desktop', 'Desktop / Laptop', '💻'], ['endpoint-printer', 'Printer / Scanner', '🖨️'], ['endpoint-mobile', 'Mobile / Tablet', '📱'],
    ['app-support', 'Application Support', '📦'], ['email-m365', 'Email / Microsoft 365', '📧'], ['user-admin', 'User & Account Admin', '👤'],
  ]},
  { id: 'cybersecurity', label: 'Cybersecurity', icon: '🛡️', description: 'Protection, identity and security services', items: [
    ['firewall', 'Firewall / UTM', '🧱'], ['edr', 'Endpoint Protection / EDR', '🦠'], ['email-sec', 'Email Security', '✉️'],
    ['iam', 'Identity & Access Management', '🔐'], ['awareness', 'Security Awareness', '🎓'], ['pentest', 'Vulnerability / Pen Test', '🔍'],
  ]},
  { id: 'infrastructure', label: 'Infrastructure & Network', icon: '🌐', description: 'Networks, servers, Wi-Fi, cabling and power', items: [
    ['network', 'Network (LAN / WAN)', '🔌'], ['wifi', 'Wi-Fi / Wireless', '📶'], ['server', 'Server Administration', '🖥️'],
    ['cabling', 'Structured Cabling', '🧵'], ['isp', 'Internet / ISP', '🌍'], ['ups', 'Power / UPS', '🔋'],
  ]},
  { id: 'cloud', label: 'Cloud & Hosting', icon: '☁️', description: 'Microsoft 365, cloud, backup and recovery', items: [
    ['m365', 'Microsoft 365', '🟦'], ['azure', 'Azure / AWS', '☁️'], ['backup', 'Backup & Recovery', '💾'], ['dr', 'Disaster Recovery', '🚨'], ['hosting', 'Web / App Hosting', '🌐'],
  ]},
  { id: 'physical', label: 'Physical Security & Building', icon: '🏢', description: 'CCTV, access control, alarms and smart building systems', items: [
    ['cctv', 'CCTV', '📹'], ['access-control', 'Access Control', '🔐'], ['alarms', 'Alarm Systems', '🚨'], ['smart-building', 'Smart Building', '🏢'],
  ]},
  { id: 'software', label: 'Software & Development', icon: '💻', description: 'Websites, portals, apps, APIs and automation', items: [
    ['website', 'Website', '🌐'], ['portal', 'Customer Portal', '🖥️'], ['application', 'Business Application', '⚙️'], ['api', 'API / Integration', '🔗'], ['automation', 'Automation', '🤖'],
  ]},
  { id: 'procurement', label: 'Technology Procurement', icon: '📦', description: 'Hardware, software and technology sourcing', items: [
    ['hardware', 'Computer / Laptop', '💻'], ['network-hardware', 'Network Equipment', '📡'], ['software-license', 'Software / Licences', '🧾'], ['accessories', 'Accessories', '⌨️'],
  ]},
  { id: 'onsite', label: 'On-Site Technical Services', icon: '🔧', description: 'Field support, installations and scheduled visits', items: [
    ['onsite-support', 'On-Site Support', '🔧'], ['installation', 'Installation / Deployment', '🧰'], ['survey', 'Technical Site Survey', '📐'],
  ]},
];

function normaliseTimestamp(value) {
  if (!value) return 0;
  if (typeof value === 'object' && typeof value.toDate === 'function') return value.toDate().getTime();
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function sortTickets(tickets) {
  return [...tickets].sort((a, b) => normaliseTimestamp(b.updatedAt || b.createdAt) - normaliseTimestamp(a.updatedAt || a.createdAt));
}

export function formatDate(value, withTime = false) {
  const stamp = normaliseTimestamp(value);
  if (!stamp) return '—';
  return new Intl.DateTimeFormat('en-ZA', {
    dateStyle: 'medium',
    ...(withTime ? { timeStyle: 'short' } : {}),
  }).format(new Date(stamp));
}

export function getService(ticket) {
  const category = SERVICE_CATALOG.find((entry) => entry.id === ticket?.serviceCategory);
  const item = category?.items.find(([id]) => id === ticket?.serviceSubCategory);
  if (item) return { icon: item[2], label: `${category.label} › ${item[1]}` };
  return { icon: category?.icon || '🔧', label: ticket?.serviceCategoryLabel || ticket?.serviceType || 'Technical Support' };
}

export function ticketRef() {
  const stamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `CIM-${stamp}-${random}`;
}

export async function getCustomerProfile(uid, fallback = {}) {
  const snap = await getDoc(doc(db, 'customers', uid));
  return snap.exists() ? { id: snap.id, ...snap.data() } : { customerId: uid, ...fallback };
}

export async function saveCustomerProfile(uid, data) {
  await setDoc(doc(db, 'customers', uid), {
    customerId: uid,
    ...data,
    updatedAt: new Date().toISOString(),
  }, { merge: true });
}

export async function getCustomerTickets(uid) {
  const snapshot = await getDocs(query(collection(db, 'tickets'), where('customerId', '==', uid), limit(100)));
  return sortTickets(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
}

export function subscribeToCustomerTickets(uid, onChange, onError) {
  const ticketQuery = query(collection(db, 'tickets'), where('customerId', '==', uid), limit(100));
  return onSnapshot(ticketQuery, (snapshot) => {
    onChange(sortTickets(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))));
  }, onError);
}

export async function getCustomerTicket(ticketId, uid) {
  const snap = await getDoc(doc(db, 'tickets', ticketId));
  if (!snap.exists()) return null;
  const data = snap.data();
  if (data.customerId !== uid && data.requesterUid !== uid) return null;
  return { id: snap.id, ...data };
}

async function uploadAttachments(ticketId, files = []) {
  if (!storage || !files.length) return [];
  const uploads = [];
  for (const file of files) {
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 140);
    const path = `ticket-attachments/${ticketId}/${Date.now()}-${safeName}`;
    const target = storageRef(storage, path);
    await uploadBytes(target, file, { contentType: file.type || 'application/octet-stream' });
    const url = await getDownloadURL(target);
    uploads.push({ name: file.name, path, url, contentType: file.type || '', size: file.size });
  }
  return uploads;
}

export async function createCustomerTicket({ user, profile, form, files = [] }) {
  if (!user?.uid) throw new Error('Your secure session has expired. Please sign in again.');
  const category = SERVICE_CATALOG.find((entry) => entry.id === form.serviceCategory);
  const sub = category?.items.find(([id]) => id === form.serviceSubCategory);
  if (!category || !sub) throw new Error('Select a valid service and technical requirement.');
  if (!form.issueTitle?.trim()) throw new Error('Add a short issue or request title.');
  if (!form.channels?.length) throw new Error('Select at least one communication channel.');

  const ref = ticketRef();
  const clientNow = new Date().toISOString();
  const ticket = {
    ref,
    ticketNumber: ref,
    customerId: user.uid,
    requesterUid: user.uid,
    clientName: profile?.name || user.displayName || 'Customer',
    name: profile?.name || user.displayName || 'Customer',
    company: profile?.company || '',
    phone: profile?.phone || '',
    email: user.email || profile?.email || '',
    serviceCategory: category.id,
    serviceCategoryLabel: category.label,
    serviceSubCategory: sub[0],
    serviceSubCategoryLabel: sub[1],
    serviceType: category.id,
    channels: form.channels,
    contactMethod: form.channels[0],
    issueTitle: form.issueTitle.trim().slice(0, 240),
    issueDetail: (form.issueDetail || '').trim().slice(0, 6000),
    problemDescription: (form.issueDetail || '').trim().slice(0, 6000),
    // Customer input never sets SLA priority; management assigns it after intake.
    priority: 'medium',
    urgency: form.urgency || 'Standard (3–5 days)',
    address: (form.address || '').trim().slice(0, 500),
    preferredDate: form.preferredDate || '',
    preferredTime: form.preferredTime || '',
    deviceType: (form.deviceType || '').trim(),
    manufacturer: (form.manufacturer || '').trim(),
    modelNumber: (form.modelNumber || '').trim(),
    serialNumber: (form.serialNumber || '').trim(),
    operatingSystem: (form.operatingSystem || '').trim(),
    physicalDamage: (form.physicalDamage || '').trim(),
    accessories: (form.accessories || '').trim(),
    attachments: [],
    status: 'open',
    assignedEngineer: 'Unassigned',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    notes: [],
    quotationRef: '',
    parts: [],
    loggedBy: 'customer',
  };

  await setDoc(doc(db, 'tickets', ref), ticket);
  try {
    const attachments = await uploadAttachments(ref, files);
    if (attachments.length) {
      ticket.attachments = attachments;
      ticket.updatedAt = new Date().toISOString();
      await updateDoc(doc(db, 'tickets', ref), { attachments, updatedAt: serverTimestamp() });
    }
  } catch (error) {
    // The ticket remains valid even if an optional attachment upload fails.
    console.error('Attachment upload failed', error);
  }

  return { ...ticket, id: ref, createdAt: clientNow, updatedAt: clientNow };
}

export function ticketProgress(status) {
  if (status === 'closed') return 3;
  if (['resolved', 'awaiting-signoff'].includes(status)) return 2;
  if (STATUS_ORDER.indexOf(status) > STATUS_ORDER.indexOf('open')) return 1;
  return 0;
}

export function isOpen(status) {
  return !['resolved', 'closed'].includes(status);
}
