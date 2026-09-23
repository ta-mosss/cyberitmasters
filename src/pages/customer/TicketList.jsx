import { Link } from 'react-router-dom';
import { formatDate, getService, STATUS_META } from '../../services/tickets/customer';

export default function TicketList({ tickets }) {
  if (!tickets.length) return <div className="customer-empty"><h3>No tickets found</h3><p>Your service desk history will appear here.</p></div>;
  return <div className="customer-ticket-list">{tickets.map((ticket) => {
    const status = STATUS_META[ticket.status] || STATUS_META.open;
    const service = getService(ticket);
    return <Link key={ticket.id} to={`/customer/tickets/${encodeURIComponent(ticket.id)}`} className="customer-ticket-card">
      <div className="customer-ticket-top"><span className="customer-ticket-ref">{ticket.ref || ticket.id}</span><span className={`customer-status ${status.tone}`}><i />{status.label}</span></div>
      <h3>{service.icon} {ticket.issueTitle || ticket.problemDescription || 'Support request'}</h3>
      <p>{service.label}</p>
      <div className="customer-ticket-meta"><span>Updated {formatDate(ticket.updatedAt || ticket.createdAt, true)}</span><span>{ticket.priority || 'Medium'} priority</span>{ticket.assignedEngineer && ticket.assignedEngineer !== 'Unassigned' && <span>Engineer: {ticket.assignedEngineer}</span>}</div>
    </Link>;
  })}</div>;
}
