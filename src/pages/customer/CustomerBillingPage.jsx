import { useOutletContext } from 'react-router-dom';

export default function CustomerBillingPage() {
  const { tickets } = useOutletContext();
  const documents = tickets.flatMap((ticket) => [ticket.quotationRef || ticket.quoteLink ? { type: 'Quotation', ref: ticket.quotationRef || ticket.ref, url: ticket.quoteLink, ticket: ticket.ref } : null, ticket.invoiceLink ? { type: 'Invoice', ref: ticket.invoiceNumber || ticket.ref, url: ticket.invoiceLink, ticket: ticket.ref } : null].filter(Boolean));
  return <div className="customer-page-stack"><div className="customer-section-head"><div><p className="portal-eyebrow">ACCOUNT DOCUMENTS</p><h2>Quotes & invoices</h2><span>Only documents already linked to your service records are shown here.</span></div></div>{documents.length ? <div className="customer-document-list">{documents.map((document) => <article key={`${document.type}-${document.ref}`}><div><strong>{document.type}</strong><span>{document.ref} · Ticket {document.ticket}</span></div>{document.url ? <a href={document.url} target="_blank" rel="noreferrer" className="portal-button portal-button-secondary">Open ↗</a> : <span className="customer-doc-muted">Available through support</span>}</article>)}</div> : <div className="customer-empty"><h3>No billing documents yet</h3><p>Quotes and invoices linked to your tickets will appear here.</p></div>}</div>;
}
