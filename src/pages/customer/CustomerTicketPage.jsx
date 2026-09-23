import { useEffect, useState } from 'react';
import { Link, useNavigate, useOutletContext, useParams } from 'react-router-dom';
import { formatDate, getCustomerTicket, getService, STATUS_META, ticketProgress } from '../../services/tickets/customer';
import { useAuth } from '../../hooks/useAuth';

export default function CustomerTicketPage() {
  const { ticketId } = useParams();
  const auth = useAuth();
  const { tickets } = useOutletContext();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState(() => tickets.find((item) => item.id === ticketId) || null);
  const [loading, setLoading] = useState(!ticket);

  useEffect(() => {
    let active = true;
    setLoading(!tickets.some((item) => item.id === ticketId));
    const fromList = tickets.find((item) => item.id === ticketId);
    if (fromList) { setTicket(fromList); setLoading(false); return () => { active = false; }; }
    getCustomerTicket(ticketId, auth.user.uid).then((result) => { if (active) { setTicket(result); setLoading(false); } }).catch(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [ticketId, tickets, auth.user.uid]);

  if (loading) return <div className="portal-loading"><div className="portal-spinner" /><p>Loading ticket…</p></div>;
  if (!ticket) return <div className="customer-empty"><h3>Ticket not found</h3><p>This ticket is not available under your customer account.</p><button className="portal-button" onClick={() => navigate('/customer/tickets')}>Back to tickets</button></div>;

  const status = STATUS_META[ticket.status] || STATUS_META.open;
  const service = getService(ticket);
  const progress = ticketProgress(ticket.status);

  return <div className="customer-page-stack"><button className="customer-back-link" onClick={() => navigate('/customer/tickets')}>← Back to tickets</button><section className="customer-ticket-hero"><div><div className="customer-ticket-top"><span className="customer-ticket-ref">{ticket.ref || ticket.id}</span><span className={`customer-status ${status.tone}`}><i />{status.label}</span></div><h2>{ticket.issueTitle || ticket.problemDescription || 'Support request'}</h2><p>{service.icon} {service.label} · Created {formatDate(ticket.createdAt, true)}</p></div></section>
    <Progress progress={progress} />
    <div className="customer-detail-grid"><section className="customer-detail-main"><DetailCard title="Request details"><p className="customer-detail-text">{ticket.issueDetail || ticket.problemDescription || 'No additional description provided.'}</p>{ticket.address && <InfoRow label="Site address" value={ticket.address} />}{ticket.preferredDate && <InfoRow label="Preferred date" value={`${ticket.preferredDate}${ticket.preferredTime ? ` ${ticket.preferredTime}` : ''}`} />}</DetailCard><DetailCard title="Device / asset information">{[['Type',ticket.deviceType],['Manufacturer',ticket.manufacturer],['Model',ticket.modelNumber],['Serial',ticket.serialNumber],['Operating System',ticket.operatingSystem],['Accessories',ticket.accessories]].filter(([,value]) => value).map(([label,value]) => <InfoRow key={label} label={label} value={value} />)}<InfoRow label="Priority" value={ticket.priority || 'Medium'} /></DetailCard><DetailCard title="Activity & updates"><div className="customer-timeline"><TimelineItem text="Ticket created and logged in our service desk." date={ticket.createdAt} />{(ticket.notes || []).filter((note) => note.type !== 'internal-only').map((note, index) => <TimelineItem key={`${note.at || index}-${index}`} text={note.txt || note.text || 'Service desk update'} date={note.at} meta={note.engineer} />)}</div></DetailCard></section>
      <aside className="customer-detail-side"><DetailCard title="Current status"><div className={`customer-status-large ${status.tone}`}><span>{status.icon}</span><strong>{status.label}</strong><p>{status.description}</p></div></DetailCard>{(ticket.quotationRef || ticket.quoteLink) && <DetailCard title="Quotation"><strong className="customer-mono">{ticket.quotationRef || 'Quotation available'}</strong>{ticket.quoteLink && <a className="portal-button portal-button-secondary customer-full-button" href={ticket.quoteLink} target="_blank" rel="noreferrer">View quotation ↗</a>}</DetailCard>}{ticket.invoiceLink && <DetailCard title="Invoice">{ticket.invoiceNumber && <strong className="customer-mono">{ticket.invoiceNumber}</strong>}<a className="portal-button portal-button-secondary customer-full-button" href={ticket.invoiceLink} target="_blank" rel="noreferrer">View invoice ↗</a></DetailCard>}{ticket.attachments?.length > 0 && <DetailCard title="Attachments"><div className="customer-file-list">{ticket.attachments.map((file) => <a key={file.path || file.name} href={file.url || '#'} target="_blank" rel="noreferrer">📎 {file.name}</a>)}</div></DetailCard>}{ticket.clientSignoff?.signed && <div className="customer-alert success"><strong>✓ Sign-off completed</strong><span>Signed by {ticket.clientSignoff.clientName || 'Client'}{ticket.clientSignoff.signedAt ? ` on ${formatDate(ticket.clientSignoff.signedAt, true)}` : ''}.</span></div>}<div className="customer-help-card"><strong>Need an update?</strong><p>Contact support and quote <b>{ticket.ref}</b>.</p><a href={`https://wa.me/27726650565?text=${encodeURIComponent(`Hello, I'm following up on support ticket ${ticket.ref}.`)}`} target="_blank" rel="noreferrer">WhatsApp support ↗</a></div></aside></div></div>;
}

function Progress({ progress }) { return <div className="customer-progress"><div className="customer-progress-line"><span style={{ width: `${(progress / 3) * 100}%` }} /></div><div className="customer-progress-steps">{['Logged','In Progress','Resolved','Closed'].map((label,index)=><div key={label} className={index < progress ? 'done' : index === progress ? 'current' : ''}><span>{index < progress ? '✓' : index + 1}</span><small>{label}</small></div>)}</div></div>; }
function DetailCard({ title, children }) { return <section className="customer-detail-card"><div className="customer-detail-card-head">{title}</div><div className="customer-detail-card-body">{children}</div></section>; }
function InfoRow({ label, value }) { return <div className="customer-info-row"><span>{label}</span><strong>{value}</strong></div>; }
function TimelineItem({ text, date, meta }) { return <div className="customer-timeline-item"><div className="customer-timeline-dot" /><div><strong>{text}</strong><small>{date ? formatDate(date, true) : 'Recorded update'}{meta ? ` · ${meta}` : ''}</small></div></div>; }
