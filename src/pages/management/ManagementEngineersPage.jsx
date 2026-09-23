import { useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Card, Badge, Empty, Toolbar } from './ManagementShared';
import { displayEngineer, formatDate } from '../../services/management/operations';

export default function ManagementEngineersPage() {
  const { data } = useOutletContext();
  const [search, setSearch] = useState('');
  const rows = useMemo(() => data.engineers.filter((person) => JSON.stringify(person).toLowerCase().includes(search.toLowerCase())), [data.engineers, search]);
  return <div className="management-page"><Card title="Engineer Directory" eyebrow="TEAM & CAPACITY"><Toolbar><input className="management-input" placeholder="Search staff, department, email…" value={search} onChange={(event) => setSearch(event.target.value)} /><span className="management-chip">{rows.length} staff</span></Toolbar>{rows.length ? <div className="management-table-wrap"><table className="management-table"><thead><tr><th>Engineer</th><th>Email</th><th>Role</th><th>Department</th><th>Phone</th><th>Status</th><th>Joined</th></tr></thead><tbody>{rows.map((person) => <tr key={person.id}><td><strong>{displayEngineer(person)}</strong><small>{person.jobTitle || 'Staff'}</small></td><td>{person.email || '—'}</td><td>{person.role || '—'}</td><td>{person.department || '—'}</td><td>{person.phone || '—'}</td><td><Badge value={person.active === false ? 'inactive' : 'active'} /></td><td>{formatDate(person.createdAt)}</td></tr>)}</tbody></table></div> : <Empty>No staff accounts found.</Empty>}</Card></div>;
}
