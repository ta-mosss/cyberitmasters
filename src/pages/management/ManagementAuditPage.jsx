import { useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Card, Empty, Toolbar } from './ManagementShared';
import { formatDate } from '../../services/management/operations';

export default function ManagementAuditPage() {
  const { data } = useOutletContext();
  const [search, setSearch] = useState('');
  const rows = useMemo(() => data.auditLogs.filter((entry) => JSON.stringify(entry).toLowerCase().includes(search.toLowerCase())), [data.auditLogs, search]);
  return <div className="management-page"><Card title="Audit Trail" eyebrow="ACTIVITY & ACCOUNTABILITY"><Toolbar><input className="management-input" placeholder="Search actor, action, reference…" value={search} onChange={(event) => setSearch(event.target.value)} /><span className="management-chip">Latest {rows.length}</span></Toolbar>{rows.length ? <div className="management-table-wrap"><table className="management-table"><thead><tr><th>Time</th><th>Actor</th><th>Role</th><th>Action</th><th>Reference</th><th>Details</th></tr></thead><tbody>{rows.map((entry) => <tr key={entry.id}><td>{formatDate(entry.createdAt)}</td><td>{entry.actor || entry.actorEmail || entry.actorUid || 'system'}</td><td>{entry.actorRole || '—'}</td><td><strong>{entry.action || 'activity'}</strong></td><td>{entry.ticketRef || entry.ticketId || entry.jobNumber || entry.jobId || entry.engineerId || '—'}</td><td className="management-audit-detail">{entry.details ? JSON.stringify(entry.details) : entry.recipient || entry.providerMessageId || '—'}</td></tr>)}</tbody></table></div> : <Empty>No audit events found.</Empty>}</Card></div>;
}
