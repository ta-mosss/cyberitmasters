import { Link, useOutletContext } from 'react-router-dom';
import TicketList from './TicketList';

export default function CustomerOverviewPage() {
  const { tickets, stats } = useOutletContext();
  const active = tickets.filter((ticket) => !['resolved', 'closed'].includes(ticket.status)).slice(0, 6);

  return (
    <div className="customer-page-stack">
      <div className="customer-section-head"><div><p className="portal-eyebrow">SERVICE DESK</p><h2>Recent activity</h2></div><Link className="portal-button portal-button-secondary" to="/customer/tickets">View all tickets</Link></div>
      {active.length ? <TicketList tickets={active} /> : <EmptyState title="No active tickets" text="Create a new service request whenever you need technical assistance." action="Create request" href="/customer/request" />}
      {stats.signoff > 0 && <div className="customer-signoff-banner"><div><strong>{stats.signoff} ticket{stats.signoff === 1 ? '' : 's'} awaiting your sign-off</strong><span>Review the completed work and sign securely from the ticket details.</span></div><Link to="/customer/tickets?filter=signoff" className="portal-button">Review</Link></div>}
    </div>
  );
}

function EmptyState({ title, text, action, href }) {
  return <div className="customer-empty"><div className="customer-empty-icon">◌</div><h3>{title}</h3><p>{text}</p><Link className="portal-button" to={href}>{action}</Link></div>;
}
