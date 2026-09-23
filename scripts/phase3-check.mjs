import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));

const failures = [];
const warnings = [];

function assert(condition, message) {
  if (!condition) failures.push(message);
}

assert(packageJson.dependencies?.react === '19.1.1', 'React must be pinned to 19.1.1 during Phase 3 migration.');
assert(packageJson.dependencies?.['react-dom'] === '19.1.1', 'ReactDOM must be pinned to 19.1.1 during Phase 3 migration.');
assert(packageJson.dependencies?.firebase === '12.19.0', 'Firebase must be pinned to 12.19.0.');
assert(packageJson.dependencies?.['react-router-dom'] === '7.18.3', 'React Router DOM must be pinned to 7.18.3.');

for (const file of [
  'src/main.jsx',
  'src/app/AppRouter.jsx',
  'src/auth/AuthProvider.jsx',
  'src/auth/guards.jsx',
  'src/services/firebase/app.js',
  'src/services/firebase/auth.js',
  'src/services/tickets/customer.js',
  'src/pages/customer/CustomerPortalPage.jsx',
  'src/pages/customer/CustomerRequestPage.jsx',
  'src/pages/customer/CustomerTicketPage.jsx',
  'src/pages/signoff/CustomerSignoffPage.jsx',
  'src/pages/signoff/SignaturePad.jsx'
]) {
  assert(fs.existsSync(path.join(root, file)), `Missing Phase 3 foundation file: ${file}`);
}

const sourceFiles = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', 'dist', '.git'].includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(jsx?|tsx?)$/.test(entry.name)) sourceFiles.push(full);
  }
}
walk(path.join(root, 'src'));

assert(fs.existsSync(path.join(root, 'src/pages/customer/CustomerOverviewPage.jsx')), 'Customer Overview React page is missing.');
assert(fs.existsSync(path.join(root, 'src/pages/customer/CustomerTicketsPage.jsx')), 'Customer Tickets React page is missing.');
assert(fs.existsSync(path.join(root, 'src/pages/customer/CustomerAssetsPage.jsx')), 'Customer Assets React page is missing.');
assert(fs.existsSync(path.join(root, 'src/pages/customer/CustomerBillingPage.jsx')), 'Customer Billing React page is missing.');
assert(fs.existsSync(path.join(root, 'src/pages/customer/CustomerProfilePage.jsx')), 'Customer Profile React page is missing.');
assert(fs.existsSync(path.join(root, 'netlify/functions/authorise/authorise.js')), 'Secure sign-off function is missing.');

for (const file of sourceFiles) {
  const content = fs.readFileSync(file, 'utf8');
  assert(!/cdnjs\.cloudflare\.com.*react|unpkg\.com\/react|gstatic\.com\/firebasejs/i.test(content), `CDN React/Firebase reference remains in ${path.relative(root, file)}`);
}

for (const file of fs.readdirSync(path.join(root, 'public')).filter((name) => name.endsWith('.html'))) {
  const full = path.join(root, 'public', file);
  const content = fs.readFileSync(full, 'utf8');
  if (/babel-standalone|gstatic\.com\/firebasejs|cdnjs\.cloudflare\.com.*react|unpkg\.com\/react/i.test(content)) {
    warnings.push(`Legacy portal retained intentionally for migration: public/${file}`);
  }
}

if (failures.length) {
  console.error('Phase 3 check FAILED');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Phase 3 foundation check PASSED');
console.log(`- React: ${packageJson.dependencies.react}`);
console.log(`- Firebase: ${packageJson.dependencies.firebase}`);
console.log(`- React Router DOM: ${packageJson.dependencies['react-router-dom']}`);
console.log(`- Source files checked: ${sourceFiles.length}`);
console.log('- Customer portal migration: present');
console.log('- Secure sign-off route/function: present');
if (warnings.length) {
  console.log('\nLegacy migration inventory (expected at this stage):');
  for (const warning of warnings) console.log(`- ${warning}`);
}
