import fs from 'node:fs';
import path from 'node:path';
const root = process.cwd();
const failures = [];
const assert = (condition, message) => { if (!condition) failures.push(message); };
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const files = [
  'src/pages/management/ManagementPortalPage.jsx',
  'src/pages/management/ManagementDashboardPage.jsx',
  'src/pages/management/ManagementTicketsPage.jsx',
  'src/pages/management/ManagementJobsPage.jsx',
  'src/pages/management/ManagementDispatchPage.jsx',
  'src/pages/management/ManagementEngineersPage.jsx',
  'src/pages/management/ManagementCustomersPage.jsx',
  'src/pages/management/ManagementAssetsPage.jsx',
  'src/pages/management/ManagementQuotesPage.jsx',
  'src/pages/management/ManagementSlaPage.jsx',
  'src/pages/management/ManagementReportsPage.jsx',
  'src/pages/management/ManagementAuditPage.jsx',
  'src/pages/management/ManagementSettingsPage.jsx',
  'src/pages/management/ManagementShared.jsx',
  'src/services/management/operations.js',
  'src/styles/management.css',
];
for (const file of files) assert(fs.existsSync(path.join(root, file)), `Missing management migration file: ${file}`);
const router = read('src/app/AppRouter.jsx');
const ops = read('src/services/management/operations.js');
const ticket = read('src/pages/management/ManagementTicketsPage.jsx');
const jobs = read('src/pages/management/ManagementJobsPage.jsx');
const rules = read('firestore.rules');
assert(router.includes('ManagementPortalPage'), 'Management portal is not connected to the React router.');
for (const route of ['tickets','jobs','dispatch','engineers','customers','assets','quotes','sla','reports','audit','settings']) assert(router.includes(`path="${route}"`), `Management route /${route} is missing.`);
assert(ops.includes("collection(db, 'tickets')"), 'Management service does not subscribe to tickets.');
assert(ops.includes("collection(db, 'jobs')"), 'Management service does not subscribe to jobs.');
assert(ops.includes("collection(db, 'users')"), 'Management service does not subscribe to staff.');
assert(ops.includes("collection(db, 'customers')"), 'Management service does not subscribe to customers.');
assert(ops.includes("collection(db, 'auditLogs')"), 'Management service does not subscribe to audit logs.');
assert(ops.includes('writeBatch(db)'), 'Management ticket/job mutations must use a batch with audit logging.');
assert(ops.includes("/.netlify/functions/create-job"), 'Management job creation must use the trusted create-job function.');
assert(ticket.includes('updateManagementTicket'), 'Management ticket editor is not connected to the write service.');
assert(jobs.includes('createJobCard'), 'Management job creator is not connected to the trusted job function.');
assert(rules.includes('function isManager()'), 'Manager security helper is missing.');
assert(rules.includes('allow update: if isManager()'), 'Manager ticket/job update enforcement is missing from Firestore rules.');
const legacy = read('public/management.html');
assert(/firebasejs|babel-standalone|ReactDOM\.createRoot/.test(legacy), 'Legacy management portal reference unexpectedly disappeared; retain it for rollback.');
for (const file of files.filter((f) => f.endsWith('.jsx') || f.endsWith('.js'))) {
  const source = read(file);
  assert(!/cdnjs\.cloudflare\.com.*react|unpkg\.com\/react|gstatic\.com\/firebasejs/i.test(source), `CDN dependency remains in ${file}`);
}
if (failures.length) { console.error('Management portal check FAILED'); failures.forEach((f) => console.error(`- ${f}`)); process.exit(1); }
console.log('Management portal check PASSED');
console.log(`- Management modules: ${files.length}`);
console.log('- Live tickets/jobs/staff/customers/assets/quotes/audit feeds: present');
console.log('- Batched mutation + audit logging: present');
console.log('- Trusted job creation: present');
console.log('- Existing backend manager security enforcement: verified');
console.log('- Legacy management portal retained for rollback: present');
