import { useMemo, useState } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { Card, Empty, Badge, Toolbar } from './ManagementShared';

export default function ManagementCustomersPage() {
  const { data } = useOutletContext();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const rows = useMemo(() => data.customers.filter((customer) => JSON.stringify(customer).toLowerCase().includes(search.toLowerCase())), [data.customers, search]);
  const ticketCount = (customer) => data.tickets.filter((ticket) => ticket.uid === customer.uid || ticket.customerUid === customer.uid || ticket.email === customer.email || ticket.company === customer.company).length;
  return <div className="management-page"><Card title="Customer Directory" eyebrow="CUSTOMER BASE"><Toolbar><input className="management-input" placeholder="Search customer, company, email…" value={search} onChange={(event) => setSearch(event.target.value)} /><span className="management-chip">{rows.length} customers</span></Toolbar>{rows.length ? <div className="management-table-wrap"><table className="management-table"><thead><tr><th>Customer</th><th>Company</th><th>Email</th><th>Phone</th><th>Tickets</th><th>Status</th></tr></thead><tbody>{rows.map((customer) => <tr key={customer.id} className="management-click-row" onClick={() => customer.uid && navigate(`/management/tickets?search=${encodeURIComponent(customer.email || customer.company || customer.uid)}`)}><td><strong>{customer.name || customer.fullName || '—'}</strong><small>{customer.customerNumber || customer.id}</small></td><td>{customer.company || customer.businessName || '—'}</td><td>{customer.email || '—'}</td><td>{customer.phone || '—'}</td><td>{ticketCount(customer)}</td><td><Badge value={customer.active === false ? 'inactive' : customer.status || 'active'} /></td></tr>)}</tbody></table></div> : <Empty>No customers found.</Empty>}</Card></div>;
}
