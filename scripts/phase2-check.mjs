import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const required=['netlify/functions/create-job/create-job.js','netlify/functions/create-job/package.json','netlify/functions/sla-monitor/sla-monitor.js','netlify/functions/sla-monitor/package.json','PHASE2_OPERATIONS.md'];
const missing=required.filter(f=>!fs.existsSync(path.join(root,f)));
if(missing.length){console.error('Missing:',missing.join(', '));process.exit(1);}
const mgmt=fs.readFileSync(path.join(root,'public/management.html'),'utf8');
if(mgmt.includes("Date.now().toString().slice(-7)")) { console.error('Legacy non-atomic job numbering remains.'); process.exit(1); }
const create=fs.readFileSync(path.join(root,'netlify/functions/create-job/create-job.js'),'utf8');
for(const token of ['runTransaction','jobSequence','verifyStaff']) if(!create.includes(token)){console.error(`create-job missing ${token}`);process.exit(1);}
const sla=fs.readFileSync(path.join(root,'netlify/functions/sla-monitor/sla-monitor.js'),'utf8');
for(const token of ['businessMinutesBetween','dueFrom','automationEscalations','exports.config']) if(!sla.includes(token)){console.error(`sla-monitor missing ${token}`);process.exit(1);}
console.log('Phase 2 checks passed.');
