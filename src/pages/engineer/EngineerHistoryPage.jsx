import { useMemo } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { ENGINEER_STATUS_META } from '../../services/tickets/engineer';

export default function EngineerHistoryPage() {
  const { tickets } = useOutletContext();
  const navigate = useNavigate();
  const history = useMemo(() => tickets.filter((ticket) => ['resolved', 'closed'].includes(ticket.status)), [tickets]);

  return (
    <>
      <section className="engineer-toolbar"><div><p className="engineer-eyebrow">SERVICE HISTORY</p><h2>Completed work</h2></div></section>
      <section className="engineer-card">
        <div className="engineer-card-head"><strong>Resolved & closed tickets</strong><span>{history.length} records</span></div>
        <div className="engineer-card-body engineer-history-list">
          {history.map((ticket) => (
            <button type="button" key={ticket.id} className="engineer-history-row" onClick={() => navigate('/engineer', { state: { selectedTicketId: ticket.id } })}>
              <div><strong>{ticket.ref || ticket.ticketNumber || ticket.id}</strong><span>{ticket.clientName || ticket.name || 'Customer'}</span></div>
              <p>{ticket.issueTitle || ticket.serviceSubCategoryLabel || ticket.serviceCategoryLabel || 'Service request'}</p>
              <span className={`engineer-badge tone-${ENGINEER_STATUS_META[ticket.status]?.tone || 'slate'}`}>{ENGINEER_STATUS_META[ticket.status]?.label || ticket.status}</span>
            </button>
          ))}
          {!history.length && <div className="engineer-empty">No completed work is currently visible.</div>}
        </div>
      </section>
    </>
  );
}
