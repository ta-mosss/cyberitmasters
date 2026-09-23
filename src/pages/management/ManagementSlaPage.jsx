import { useMemo } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { Card, Badge, Empty, KpiGrid } from './ManagementShared';
import { formatDate } from '../../services/management/operations';

export default function ManagementSlaPage() {
  const { data } = useOutletContext();
  const navigate = useNavigate();
  const open = useMemo(() => data.tickets.filter((ticket) => !['resolved', 'closed', 'cancelled'].includes(String(ticket.status || '').toLowerCase())).sort((a, b) => String(b.slaStatus || '').localeCompare(String(a.slaStatus || ''))), [data.tickets]);
  const breached = data.tickets.filter((ticket) => ['breached', 'overdue'].includes(String(ticket.slaStatus || '').toLowerCase())).length;
  const risk = data.tickets.filter((ticket) => String(ticket.slaStatus || '').toLowerCase() === 'at-risk').length;
  const within = data.tickets.filter((ticket) => ['within-sla', 'tracking'].includes(String(ticket.slaStatus || '').toLowerCase())).length;
  return <div className="management-page"><KpiGrid items={[{ label: 'Breached', value: breached }, { label: 'At Risk', value: risk }, { label: 'Within SLA', value: within }, { label: 'Open', value: open.length }]} /><Card title="Escalation Queue" eyebrow="SERVER-EVALUATED SLA"><p className="management-card-copy">The portal displays the SLA state written by the scheduled SLA monitor. It does not calculate or override the contractual clock in the browser.</p>{open.length ? <div className="management-table-wrap"><table className="management-table"><thead><tr><th>Ticket</th><th>Priority</th><th>Status</th><th>SLA</th><th>Due</th><th>Elapsed</th></tr></thead><tbody>{open.slice(0, 100).map((ticket) => <tr className="management-click-row" key={ticket.id} onClick={() => navigate(`/management/tickets?ticket=${encodeURIComponent(ticket.id)}`)}><td><strong>{ticket.ref || ticket.ticketNumber || ticket.id}</strong><small>{ticket.company || ticket.clientName || ticket.name || '—'}</small></td><td><Badge value={ticket.priority || 'medium'} /></td><td><Badge value={ticket.status || 'open'} /></td><td><Badge value={ticket.slaStatus || 'pending evaluation'} /></td><td>{formatDate(ticket.slaDueAt)}</td><td>{ticket.slaElapsedBusinessMinutes != null ? `${ticket.slaElapsedBusinessMinutes} min` : '—'}</td></tr>)}</tbody></table></div> : <Empty>No open tickets.</Empty>}</Card></div>;
}
