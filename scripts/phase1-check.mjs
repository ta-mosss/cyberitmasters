import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const required = [
  'firebase.json','firestore.rules','storage.rules',
  'netlify/functions/_lib/auth.js',
  'netlify/functions/authorise/authorise.js',
  'netlify/functions/send-ticket-email/send-ticket-email.js',
  // Phase 3 replaced the legacy public/*.html portals with the React app;
  // their removal from public/ is enforced by phase3-check.mjs and management-check.mjs instead.
  'src/pages/signoff/CustomerSignoffPage.jsx',
];
for (const file of required) if (!fs.existsSync(file)) throw new Error(`Missing Phase 1 file: ${file}`);
for (const obsolete of ['firestore.rules.phase4','storage.rules.phase4','firebase/firestore.rules.email-snippet','firebase/storage.rules']) {
  if (fs.existsSync(obsolete)) throw new Error(`Obsolete rule fragment still present: ${obsolete}`);
}
const fnFiles = ['netlify/functions/_lib/auth.js','netlify/functions/authorise/authorise.js','netlify/functions/send-ticket-email/send-ticket-email.js'];
for (const file of fnFiles) {
  const r=spawnSync(process.execPath,['--check',file],{encoding:'utf8'});
  if(r.status!==0) throw new Error(`${file}: ${r.stderr||r.stdout}`);
}
const text = fs.readFileSync('src/pages/signoff/CustomerSignoffPage.jsx','utf8');
if (text.includes('ticketDoc.update') || text.includes('addDoc(') || text.includes('updateDoc(') || text.includes('rtdb.ref')) throw new Error('CustomerSignoffPage.jsx still contains direct Firebase writes.');
if (!text.includes('/.netlify/functions/authorise')) throw new Error('CustomerSignoffPage.jsx is not using the secured authorise function.');
const email = fs.readFileSync('netlify/functions/send-ticket-email/send-ticket-email.js','utf8');
if (email.includes('TODO: Add staff authentication')) throw new Error('Email function still contains legacy auth TODO.');
console.log('Phase 1 security checks passed.');
