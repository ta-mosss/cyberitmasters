import { useMemo } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { Card, Badge, Empty, KpiGrid } from './ManagementShared';
import { displayCustomer, displayEngineer, formatDate } from '../../services/management/operations';

export default function ManagementDashboardPage() {
  const { data, stats } = useOutletContext();
  const navigate = useNavigate();
  const active = useMemo(() => data.tickets.filter((ticket) => !['resolved', 'closed'].includes(String(ticket.status || '').toLowerCase())).sort((a, b) => String(b.updatedAt?.seconds || b.updatedAt || '').localeCompare(String(a.updatedAt?.seconds || a.updatedAt || ''))).slice(0, 10), [data.tickets]);
  const unassigned = data.jobs.filter((job) => !job.assignedEngineer || job.assignedEngineer === 'Unassigned').slice(0, 6);
  const breached = data.tickets.filter((ticket) => ['overdue', 'breached'].includes(String(ticket.slaStatus || '').toLowerCase())).slice(0, 5);
  const serviceMix = {};
  data.tickets.forEach((ticket) => { const key = ticket.serviceCategoryLabel || ticket.serviceType || 'General'; serviceMix[key] = (serviceMix[key] || 0) + 1; });

  return <div className="management-page">
    <KpiGrid items={[
      { label: 'Active Tickets', value: stats.activeTickets, meta: `${stats.tickets} total` },
      { label: 'Jobs', value: stats.jobs, meta: `${stats.dispatch} awaiting dispatch` },
      { label: 'Engineers Online', value: stats.engineers, meta: 'active staff accounts' },
      { label: 'SLA Attention', value: stats.overdue, meta: 'overdue / breached' },
    ]} />

    <div className="management-grid-2">
      <Card title="Live Service Queue" eyebrow="CUSTOMER → ENGINEER">
        {active.length ? <div className="management-table-wrap"><table className="management-table"><thead><tr><th>Reference</th><th>Customer</th><th>Engineer</th><th>Status</th><th>SLA</th></tr></thead><tbody>{active.map((ticket) => <tr key={ticket.id} onClick={() => navigate(`/management/tickets?ticket=${encodeURIComponent(ticket.id)}`)} className="management-click-row"><td><strong>{ticket.ref || ticket.ticketNumber || ticket.id}</strong><small>{ticket.issueTitle || ticket.serviceType || 'Service request'}</small></td><td>{displayCustomer(ticket)}</td><td>{ticket.assignedEngineer || 'Unassigned'}</td><td><Badge value={ticket.status || 'open'} /></td><td><Badge value={ticket.slaStatus || 'tracking'} /></td></tr>)}</tbody></table></div> : <Empty>No active tickets.</Empty>}
      </Card>

      <Card title="Dispatch Control" eyebrow="FIELD OPERATIONS" actions={<button className="management-btn management-btn-primary" type="button" onClick={() => navigate('/management/dispatch')}>Open Dispatch</button>}>
        {unassigned.length ? <div className="management-list">{unassigned.map((job) => <button className="management-list-row" key={job.id} type="button" onClick={() => navigate('/management/jobs')}><span><strong>{job.jobNumber || job.id}</strong><small>{job.customerName || job.company || '—'} · {job.jobType || 'Service'}</small></span><span><Badge value={job.priority || 'medium'} /><small>{job.scheduledDate || 'No date'} {job.scheduledTime || ''}</small></span></button>)}</div> : <Empty>Dispatch queue is clear.</Empty>}
      </Card>
    </div>

    <div className="management-grid-3">
      <Card title="SLA Queue" eyebrow="CONTROL">
        {breached.length ? <div className="management-list">{breached.map((ticket) => <button className="management-list-row" key={ticket.id} type="button" onClick={() => navigate(`/management/tickets?ticket=${encodeURIComponent(ticket.id)}`)}><span><strong>{ticket.ref || ticket.id}</strong><small>{displayCustomer(ticket)}</small></span><Badge value={ticket.slaStatus} /></button>)}</div> : <Empty>No breached SLA records.</Empty>}
      </Card>
      <Card title="Service Mix" eyebrow="VOLUME">
        {Object.entries(serviceMix).slice(0, 8).map(([name, count]) => <div className="management-bar-row" key={name}><span>{name}</span><b>{count}</b></div>)}
      </Card>
      <Card title="Operations Snapshot" eyebrow="TODAY">
        <div className="management-stat-list"><span>Urgent tickets <b>{stats.urgent}</b></span><span>Unassigned jobs <b>{stats.dispatch}</b></span><span>Completed jobs <b>{data.jobs.filter((job) => job.status === 'completed').length}</b></span><span>Tracked time <b>{data.tickets.reduce((total, t) => total + Number(t.timeSpentMinutes || 0), 0)} min</b></span></div>
      </Card>
    </div>

    <Card title="Recent Operational Activity" eyebrow="AUDIT" actions={<button className="management-btn management-btn-ghost" type="button" onClick={() => navigate('/management/audit')}>View full audit</button>}>
      {data.auditLogs.slice(0, 8).length ? <div className="management-timeline">{data.auditLogs.slice(0, 8).map((entry) => <div key={entry.id}><span className="management-timeline-dot" /><div><strong>{entry.action || 'activity'}</strong><small>{entry.actor || entry.actorEmail || 'system'} · {formatDate(entry.createdAt)}</small></div></div>)}</div> : <Empty>No audit events yet.</Empty>}
    </Card>
  </div>;
}
