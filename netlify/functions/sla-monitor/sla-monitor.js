const { FieldValue, Timestamp } = require('firebase-admin/firestore');
const { initAdmin } = require('../_lib/auth');
const { Resend } = require('resend');

// SLA policy is expressed in SAST business time: Monday-Friday, 08:00-17:00.
const DEFAULTS = {
  urgent: { target: 120, warning: 60 },
  high: { target: 480, warning: 120 },
  medium: { target: 1440, warning: 240 },
  low: { target: 2880, warning: 480 },
};
const OPEN = [
  'open','new','assigned','in-progress','awaiting-customer','awaiting-parts',
  'scheduled','en-route','onsite','pending','quoted','resolved'
];
const PAUSED = new Set(['awaiting-authorisation','awaiting-payment','awaiting-signoff','closed','cancelled']);

const SAST_OFFSET_MS = 2 * 60 * 60 * 1000;

function toSastDate(date) {
  return new Date(new Date(date).getTime() + SAST_OFFSET_MS);
}

function fromSastDate(date) {
  return new Date(new Date(date).getTime() - SAST_OFFSET_MS);
}

function businessMinutesBetween(start, end) {
  const a = toSastDate(start);
  const b = toSastDate(end);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime()) || b <= a) return 0;

  let total = 0;
  const cur = new Date(a);
  cur.setUTCHours(0, 0, 0, 0);

  while (cur < b) {
    const day = cur.getUTCDay();
    if (day !== 0 && day !== 6) {
      const dayStart = new Date(cur);
      dayStart.setUTCHours(8, 0, 0, 0);
      const dayEnd = new Date(cur);
      dayEnd.setUTCHours(17, 0, 0, 0);
      const from = new Date(Math.max(a.getTime(), dayStart.getTime()));
      const to = new Date(Math.min(b.getTime(), dayEnd.getTime()));
      if (to > from) total += (to - from) / 60000;
    }
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return Math.round(total);
}

function dueFrom(start, minutes) {
  let cur = toSastDate(start);
  let remain = Number(minutes) || 0;

  while (remain > 0) {
    const day = cur.getUTCDay();
    if (day === 0 || day === 6) {
      cur.setUTCDate(cur.getUTCDate() + (day === 6 ? 2 : 1));
      cur.setUTCHours(8, 0, 0, 0);
      continue;
    }
    if (cur.getUTCHours() < 8) cur.setUTCHours(8, 0, 0, 0);
    if (cur.getUTCHours() >= 17) {
      cur.setUTCDate(cur.getUTCDate() + 1);
      cur.setUTCHours(8, 0, 0, 0);
      continue;
    }
    const available = (17 * 60) - (cur.getUTCHours() * 60 + cur.getUTCMinutes());
    const use = Math.min(remain, available);
    cur = new Date(cur.getTime() + use * 60000);
    remain -= use;
  }
  return fromSastDate(cur);
}

async function notify(db, subject, text, key) {
  const recipients = String(process.env.SLA_ALERT_EMAILS || '').split(',').map(x => x.trim()).filter(Boolean);
  if (recipients.length && process.env.RESEND_API_KEY) {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: process.env.TICKETS_FROM_EMAIL || 'ITsupport@mbulahenigroup.co.za',
        to: recipients,
        subject,
        text,
      });
    } catch (e) {
      console.error('SLA email failed', e);
    }
  }
  await db.collection('automationEscalations').doc(key).set({
    subject, text, recipients, createdAt: FieldValue.serverTimestamp(), type: 'sla'
  }, { merge: true });
}

async function loadOpenTickets(db) {
  const results = new Map();
  for (const status of OPEN) {
    let last = null;
    do {
      let query = db.collection('tickets')
        .where('status', '==', status)
        .orderBy('__name__')
        .limit(500);
      if (last) query = query.startAfter(last);
      const snap = await query.get();
      snap.docs.forEach(doc => results.set(doc.id, doc));
      last = snap.docs.length === 500 ? snap.docs[snap.docs.length - 1] : null;
    } while (last);
  }
  return [...results.values()];
}

exports.handler = async () => {
  try {
    const { db } = initAdmin();
    const policiesSnap = await db.collection('slaPolicies').get();
    const policies = { ...DEFAULTS };
    policiesSnap.forEach(d => {
      const x = d.data();
      if (x.priority && x.targetMinutes) {
        policies[String(x.priority).toLowerCase()] = {
          target: Number(x.targetMinutes),
          warning: Number(x.warningMinutes || Math.round(x.targetMinutes * 0.25))
        };
      }
    });

    const docs = await loadOpenTickets(db);
    let updated = 0;
    let alerts = 0;

    for (const doc of docs) {
      const t = doc.data();
      if (PAUSED.has(t.status)) continue;

      const created = t.createdAt?.toDate?.() || new Date(t.createdAt || 0);
      if (Number.isNaN(created.getTime())) continue;

      const p = policies[String(t.priority || 'medium').toLowerCase()] || policies.medium;
      const due = t.slaDueAt?.toDate?.() || dueFrom(created, p.target);
      const elapsed = businessMinutesBetween(created, new Date());
      const warningAt = Math.max(0, p.target - p.warning);
      const status = elapsed >= p.target ? 'breached' : (elapsed >= warningAt ? 'at-risk' : 'within-sla');
      const prior = t.slaStatus || 'tracking';

      // Do not touch updatedAt. Only persist when the SLA state/target changes;
      // the UI can derive live elapsed time from createdAt and these values.
      const needsWrite =
        status !== prior ||
        Number(t.slaTargetMinutes || 0) !== p.target ||
        !t.slaDueAt;

      if (needsWrite) {
        const update = {
          slaStatus: status,
          slaTargetMinutes: p.target,
          slaElapsedBusinessMinutes: elapsed,
          slaDueAt: Timestamp.fromDate(due),
          slaLastEvaluatedAt: FieldValue.serverTimestamp(),
        };
        if (status !== prior) update.slaEscalationLevel = status;
        await doc.ref.update(update);
        updated++;
      }

      if (status !== prior && (status === 'at-risk' || status === 'breached')) {
        const key = `${doc.id}:${status}`;
        await notify(
          db,
          `SLA ${status.toUpperCase()}: ${t.ref || doc.id}`,
          `Ticket ${t.ref || doc.id} is ${status}. Priority: ${t.priority || 'medium'}. Target: ${p.target} business minutes. Elapsed: ${elapsed} business minutes.`,
          key
        );
        alerts++;
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, checked: docs.length, updated, alerts })
    };
  } catch (e) {
    console.error('sla-monitor error', e);
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
};

exports.config = { schedule: '*/15 * * * *' };
