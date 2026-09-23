import { useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Card, Badge, Empty, Field, Modal, Toolbar } from './ManagementShared';
import { createJobCard, displayCustomer, displayEngineer, MANAGEMENT_JOB_STATUSES, updateManagementJob } from '../../services/management/operations';

export default function ManagementJobsPage() {
  const { data, canWrite, auth } = useOutletContext();
  const [showCreate, setShowCreate] = useState(false);
  const [selected, setSelected] = useState(null);
  const [status, setStatus] = useState('');
  const rows = useMemo(() => data.jobs.filter((job) => !status || job.status === status), [data.jobs, status]);
  return <div className="management-page"><Card title="Job Cards" eyebrow="FIELD WORK ORDERS" actions={<button className="management-btn management-btn-primary" type="button" disabled={!canWrite} onClick={() => setShowCreate(true)}>+ Create Job Card</button>}>
    <Toolbar><select className="management-input" value={status} onChange={(event) => setStatus(event.target.value)}><option value="">All job statuses</option>{MANAGEMENT_JOB_STATUSES.map((value) => <option key={value}>{value}</option>)}</select><span className="management-chip">{rows.length} job cards</span></Toolbar>
    {rows.length ? <div className="management-table-wrap"><table className="management-table"><thead><tr><th>Job</th><th>Ticket</th><th>Customer</th><th>Engineer</th><th>Type</th><th>Status</th><th>Schedule</th></tr></thead><tbody>{rows.map((job) => <tr key={job.id} className="management-click-row" onClick={() => setSelected(job)}><td><strong>{job.jobNumber || job.id}</strong><small>{job.scope?.slice(0, 70) || 'Work order'}</small></td><td>{job.ticketRef || '—'}</td><td>{displayCustomer(job)}</td><td>{job.assignedEngineer || 'Unassigned'}</td><td>{job.jobType || 'Service'}</td><td><Badge value={job.status || 'scheduled'} /></td><td>{job.scheduledDate || '—'} {job.scheduledTime || ''}</td></tr>)}</tbody></table></div> : <Empty>No jobs match this status.</Empty>}
  </Card>{showCreate && <CreateJobModal tickets={data.tickets} engineers={data.engineers} close={() => setShowCreate(false)} />}{selected && <JobDetailModal job={selected} engineers={data.engineers} canWrite={canWrite} auth={auth} close={() => setSelected(null)} />}</div>;
}

function CreateJobModal({ tickets, engineers, close }) {
  const [form, setForm] = useState({ ticketRef: '', customerName: '', jobType: 'Onsite', assignedEngineer: 'Unassigned', scheduledDate: '', scheduledTime: '', priority: 'medium', scope: '', status: 'scheduled' });
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const choices = engineers.filter((person) => person.active !== false && person.role === 'engineer');
  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  async function save() { setSaving(true); try { const result = await createJobCard(form); setMessage(`Created ${result.jobNumber}.`); setTimeout(close, 500); } catch (error) { setMessage(error.message); } finally { setSaving(false); } }
  return <Modal title="Create Job Card" close={close}><div className="management-form-grid">
    <Field label="Ticket reference"><select className="management-input" value={form.ticketRef} onChange={(event) => { const value = event.target.value; const ticket = tickets.find((item) => (item.ref || item.ticketNumber || item.id) === value); set('ticketRef', value); if (ticket) set('customerName', displayCustomer(ticket)); }}><option value="">Select ticket</option>{tickets.map((ticket) => <option key={ticket.id}>{ticket.ref || ticket.ticketNumber || ticket.id}</option>)}</select></Field>
    <Field label="Customer"><input className="management-input" value={form.customerName} onChange={(event) => set('customerName', event.target.value)} /></Field>
    <Field label="Job type"><select className="management-input" value={form.jobType} onChange={(event) => set('jobType', event.target.value)}>{['Remote','Onsite','Installation','Survey','Repair','Maintenance','Project'].map((value) => <option key={value}>{value}</option>)}</select></Field>
    <Field label="Engineer"><select className="management-input" value={form.assignedEngineer} onChange={(event) => set('assignedEngineer', event.target.value)}><option>Unassigned</option>{choices.map((person) => <option key={person.id}>{displayEngineer(person)}</option>)}</select></Field>
    <Field label="Date"><input className="management-input" type="date" value={form.scheduledDate} onChange={(event) => set('scheduledDate', event.target.value)} /></Field>
    <Field label="Time"><input className="management-input" type="time" value={form.scheduledTime} onChange={(event) => set('scheduledTime', event.target.value)} /></Field>
    <Field label="Priority"><select className="management-input" value={form.priority} onChange={(event) => set('priority', event.target.value)}>{['urgent','high','medium','low'].map((value) => <option key={value}>{value}</option>)}</select></Field>
    <Field label="Scope / work order" full><textarea className="management-input" rows="6" value={form.scope} onChange={(event) => set('scope', event.target.value)} /></Field>
  </div>{message && <div className="management-inline-message">{message}</div>}<div className="management-button-row"><button className="management-btn management-btn-primary" type="button" disabled={saving} onClick={save}>{saving ? 'Creating…' : 'Create job'}</button><button className="management-btn management-btn-ghost" type="button" onClick={close}>Cancel</button></div></Modal>;
}

function JobDetailModal({ job, engineers, canWrite, auth, close }) {
  const [form, setForm] = useState({ status: job.status || 'scheduled', assignedEngineer: job.assignedEngineer || 'Unassigned', priority: job.priority || 'medium', scheduledDate: job.scheduledDate || '', scheduledTime: job.scheduledTime || '', lastNote: job.lastNote || '' });
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  async function save() { if (!canWrite) return; setSaving(true); try { await updateManagementJob(job, form, { uid: auth?.user?.uid, email: auth?.user?.email, role: auth?.role }); setMessage('Job updated and audit logged.'); } catch (error) { setMessage(error.message); } finally { setSaving(false); } }
  return <Modal title={job.jobNumber || job.id} close={close}><div className="management-form-grid">
    <Field label="Ticket"><input className="management-input" readOnly value={job.ticketRef || '—'} /></Field><Field label="Customer"><input className="management-input" readOnly value={displayCustomer(job)} /></Field>
    <Field label="Engineer"><select className="management-input" disabled={!canWrite} value={form.assignedEngineer} onChange={(event) => setForm({ ...form, assignedEngineer: event.target.value })}><option>Unassigned</option>{engineers.filter((person) => person.active !== false && person.role === 'engineer').map((person) => <option key={person.id}>{displayEngineer(person)}</option>)}</select></Field>
    <Field label="Status"><select className="management-input" disabled={!canWrite} value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>{MANAGEMENT_JOB_STATUSES.map((value) => <option key={value}>{value}</option>)}</select></Field>
    <Field label="Date"><input className="management-input" disabled={!canWrite} type="date" value={form.scheduledDate} onChange={(event) => setForm({ ...form, scheduledDate: event.target.value })} /></Field><Field label="Time"><input className="management-input" disabled={!canWrite} type="time" value={form.scheduledTime} onChange={(event) => setForm({ ...form, scheduledTime: event.target.value })} /></Field>
    <Field label="Priority"><select className="management-input" disabled={!canWrite} value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value })}>{['urgent','high','medium','low'].map((value) => <option key={value}>{value}</option>)}</select></Field>
    <Field label="Work notes" full><textarea className="management-input" disabled={!canWrite} rows="7" value={form.lastNote} onChange={(event) => setForm({ ...form, lastNote: event.target.value })} /></Field>
  </div>{message && <div className="management-inline-message">{message}</div>}<button className="management-btn management-btn-primary" type="button" disabled={!canWrite || saving} onClick={save}>{saving ? 'Saving…' : 'Save job'}</button></Modal>;
}
