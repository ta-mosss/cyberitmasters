import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const failures = [];
const assert = (condition, message) => { if (!condition) failures.push(message); };
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const requiredFiles = [
  'src/pages/engineer/EngineerPortalPage.jsx',
  'src/pages/engineer/EngineerWorkPage.jsx',
  'src/pages/engineer/EngineerSchedulePage.jsx',
  'src/pages/engineer/EngineerHistoryPage.jsx',
  'src/pages/engineer/EngineerProfilePage.jsx',
  'src/services/tickets/engineer.js',
];
for (const file of requiredFiles) assert(fs.existsSync(path.join(root, file)), `Missing engineer migration file: ${file}`);

const router = read('src/app/AppRouter.jsx');
const service = read('src/services/tickets/engineer.js');
const work = read('src/pages/engineer/EngineerWorkPage.jsx');
const storageRules = read('storage.rules');
const firestoreRules = read('firestore.rules');
const legacy = read('legacy-portals/engineer.html');

assert(router.includes('EngineerPortalPage'), 'Engineer route is not connected to EngineerPortalPage.');
assert(router.includes('path="schedule"') && router.includes('path="history"') && router.includes('path="profile"'), 'Engineer child routes are incomplete.');
assert(service.includes("where('assignedEngineerId', '==', uid)"), 'Engineer queue must support UID-based assignment.');
assert(service.includes("where('assignedEngineer', '==', engineerName)"), 'Engineer queue must preserve legacy name-based assignments.');
assert(service.includes("collection(db, 'tickets', ticket.id, 'timeEntries')"), 'Engineer timer must retain an auditable timeEntries record.');
assert(service.includes('ticket-attachments/${ticket.ref || ticket.id}/engineer/'), 'Engineer uploads must remain ticket-scoped.');
assert(service.includes("mode: 'create-link'"), 'Engineer sign-off service is missing the server-authorised create-link request.');
assert(work.includes('VITE_SIGNOFF_FUNCTION_URL') || work.includes('/.netlify/functions/authorise'), 'Engineer sign-off function URL is missing.');
assert(firestoreRules.includes('match /timeEntries/{entryId}'), 'Nested ticket time-entry security rule is missing.');
assert(firestoreRules.includes('assignedToTicket(resource.data)'), 'Ticket update security must remain assignment-bound.');
assert(storageRules.includes('match /ticket-attachments/{ticketRef}/{allPaths=**}'), 'Ticket attachment storage scope is missing.');
assert(storageRules.includes('assigned(ticketRef)'), 'Engineer ticket attachment access must remain assignment-bound.');
assert(/firebasejs|babel-standalone|ReactDOM\.createRoot/.test(legacy), 'Legacy engineer portal reference is missing from the rollback archive.');

if (failures.length) {
  console.error('Engineer portal check FAILED');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('Engineer portal check PASSED');
console.log(`- Required migration files: ${requiredFiles.length}`);
console.log('- UID + legacy name-based assignment queries: present');
console.log('- Auditable ticket timeEntries: present');
console.log('- Assignment-bound ticket/storage security: present');
console.log('- Secure server-authorised sign-off integration: present');
console.log('- Legacy engineer portal retained outside public build for rollback: present');
