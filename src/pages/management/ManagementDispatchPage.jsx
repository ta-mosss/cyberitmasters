import { useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Card, Badge, Empty, Field, Modal, Toolbar } from './ManagementShared';
import { displayEngineer, updateManagementJob } from '../../services/management/operations';

export default function ManagementDispatchPage() {
  const { data, canWrite, auth } = useOutletContext();
  const [engineerFilter, setEngineerFilter] = useState('Unassigned');
  const [selected, setSelected] = useState(null);
  const [sort, setSort] = useState('priority');
  const waiting = useMemo(() => data.jobs.filter((job) => !job.assignedEngineer || job.assignedEngineer === 'Unassigned' || (engineerFilter !== 'Unassigned' && job.assignedEngineer === engineerFilter)).sort((a, b) => {
    if (sort === 'date') return String(a.scheduledDate || '').localeCompare(String(b.scheduledDate || ''));
    const weight = { urgent: 4, high: 3, medium: 2, low: 1 };
    return (weight[String(b.priority || 'medium')] || 2) - (weight[String(a.priority || 'medium')] || 2);
  }), [data.jobs, engineerFilter, sort]);
  const engineers = data.engineers.filter((person) => person.role === 'engineer' && person.active !== false);

  return <div className="management-page">
    <Card title="Dispatch Board" eyebrow="RESOURCE ALLOCATION">
      <Toolbar><select className="management-input" value={engineerFilter} onChange={(event) => setEngineerFilter(event.target.value)}><option>Unassigned</option>{engineers.map((person) => <option key={person.id}>{displayEngineer(person)}</option>)}</select><select className="management-input" value={sort} onChange={(event) => setSort(event.target.value)}><option value="priority">Sort by priority</option><option value="date">Sort by scheduled date</option></select><span className="management-chip">{waiting.length} jobs</span></Toolbar>
      {waiting.length ? <div className="management-table-wrap"><table className="management-table"><thead><tr><th>Job</th><th>Customer</th><th>Type</th><th>Priority</th><th>Engineer</th><th>Schedule</th><th>Status</th></tr></thead><tbody>{waiting.map((job) => <tr key={job.id} className="management-click-row" onClick={() => setSelected(job)}><td><strong>{job.jobNumber || job.id}</strong><small>{job.ticketRef || 'No ticket'}</small></td><td>{job.customerName || job.company || '—'}</td><td>{job.jobType || 'Service'}</td><td><Badge value={job.priority || 'medium'} /></td><td>{job.assignedEngineer || 'Unassigned'}</td><td>{job.scheduledDate || '—'} {job.scheduledTime || ''}</td><td><Badge value={job.status || 'scheduled'} /></td></tr>)}</tbody></table></div> : <Empty>Dispatch queue is clear.</Empty>}
    </Card>
    <div className="management-grid-3">{engineers.map((engineer) => { const count = data.jobs.filter((job) => job.assignedEngineer === displayEngineer(engineer) && !['completed','cancelled'].includes(job.status)).length; return <Card key={engineer.id} title={displayEngineer(engineer)} eyebrow={engineer.department || engineer.jobTitle || 'FIELD ENGINEER'}><div className="management-engineer-load"><strong>{count}</strong><span>active jobs</span></div><Badge value={engineer.active === false ? 'inactive' : 'active'} /></Card>; })}</div>
    {selected && <DispatchModal job={selected} engineers={engineers} canWrite={canWrite} auth={auth} close={() => setSelected(null)} />}
  </div>;
}

function DispatchModal({ job, engineers, canWrite, auth, close }) {
  const [engineer, setEngineer] = useState(job.assignedEngineer || 'Unassigned');
  const [status, setStatus] = useState(job.status || 'scheduled');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  async function save() { if (!canWrite) return; setSaving(true); try { await updateManagementJob(job, { assignedEngineer: engineer, status }, { uid: auth?.user?.uid, email: auth?.user?.email, role: auth?.role }); setMessage('Dispatch assignment saved.'); } catch (error) { setMessage(error.message); } finally { setSaving(false); } }
  return <Modal title={`Dispatch ${job.jobNumber || job.id}`} close={close}><div className="management-form-grid"><Field label="Engineer"><select className="management-input" value={engineer} disabled={!canWrite} onChange={(event) => setEngineer(event.target.value)}><option>Unassigned</option>{engineers.map((person) => <option key={person.id}>{displayEngineer(person)}</option>)}</select></Field><Field label="Job status"><select className="management-input" value={status} disabled={!canWrite} onChange={(event) => setStatus(event.target.value)}>{['scheduled','dispatched','en-route','onsite','in-progress','awaiting-parts','completed','cancelled'].map((value) => <option key={value}>{value}</option>)}</select></Field></div>{message && <div className="management-inline-message">{message}</div>}<div className="management-button-row"><button className="management-btn management-btn-primary" disabled={!canWrite || saving} type="button" onClick={save}>{saving ? 'Saving…' : 'Assign & audit'}</button><button className="management-btn management-btn-ghost" type="button" onClick={close}>Close</button></div></Modal>;
}
