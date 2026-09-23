import { useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Card, Empty, Badge, Toolbar, KpiGrid } from './ManagementShared';
import { formatDate } from '../../services/management/operations';

export default function ManagementQuotesPage() {
  const { data } = useOutletContext();
  const [search, setSearch] = useState('');
  const rows = useMemo(() => data.quotes.filter((quote) => JSON.stringify(quote).toLowerCase().includes(search.toLowerCase())), [data.quotes, search]);
  const pending = data.quotes.filter((quote) => /pending|sent|await/i.test(quote.status || '')).length;
  const paid = data.quotes.filter((quote) => /paid|invoice/i.test(quote.status || '')).length;
  return <div className="management-page"><KpiGrid items={[{ label: 'Records', value: data.quotes.length }, { label: 'Awaiting Action', value: pending }, { label: 'Invoices / Paid', value: paid }, { label: 'Customers', value: new Set(data.quotes.map((q) => q.customerId || q.company || q.customerName).filter(Boolean)).size }]} /><Card title="Quotes & Invoices" eyebrow="COMMERCIAL OPERATIONS"><Toolbar><input className="management-input" placeholder="Search reference, customer, status…" value={search} onChange={(event) => setSearch(event.target.value)} /><span className="management-chip">Read-only commercial register</span></Toolbar>{rows.length ? <div className="management-table-wrap"><table className="management-table"><thead><tr><th>Reference</th><th>Customer</th><th>Amount</th><th>Type</th><th>Status</th><th>Updated</th></tr></thead><tbody>{rows.map((quote) => <tr key={quote.id}><td><strong>{quote.ref || quote.quotationRef || quote.invoiceNumber || quote.id}</strong></td><td>{quote.company || quote.customerName || '—'}</td><td>{quote.currency || ''} {quote.total ?? quote.amount ?? '—'}</td><td>{quote.type || 'quote'}</td><td><Badge value={quote.status || 'pending'} /></td><td>{formatDate(quote.updatedAt || quote.createdAt)}</td></tr>)}</tbody></table></div> : <Empty>No quotes or invoices found.</Empty>}</Card></div>;
}
