import { useMemo, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { ACTIVE_ENGINEER_STATUSES, ENGINEER_STATUS_META } from '../../services/tickets/engineer';

export default function EngineerSchedulePage() {
  const { tickets } = useOutletContext();
  const navigate = useNavigate();
  const [range, setRange] = useState('upcoming');

  const scheduled = useMemo(() => {
    const items = tickets.filter((ticket) => ticket.preferredDate && ACTIVE_ENGINEER_STATUSES.includes(ticket.status));
    return [...items].sort((a, b) => `${a.preferredDate} ${a.preferredTime || ''}`.localeCompare(`${b.preferredDate} ${b.preferredTime || ''}`));
  }, [tickets]);

  const visible = range === 'all' ? tickets.filter((ticket) => ticket.preferredDate) : scheduled;

  function open(ticketId) {
    navigate('/engineer', { state: { selectedTicketId: ticketId } });
  }

  return (
    <>
      <section className="engineer-toolbar">
        <div><p className="engineer-eyebrow">FIELD CALENDAR</p><h2>Schedule</h2></div>
        <select className="engineer-input engineer-small-select" value={range} onChange={(event) => setRange(event.target.value)}>
          <option value="upcoming">Active scheduled work</option>
          <option value="all">All scheduled tickets</option>
        </select>
      </section>
      <section className="engineer-card">
        <div className="engineer-card-head"><strong>Scheduled jobs</strong><span>{visible.length} items</span></div>
        <div className="engineer-card-body engineer-schedule-list">
          {visible.map((ticket) => (
            <button type="button" key={ticket.id} className="engineer-schedule-row" onClick={() => open(ticket.id)}>
              <div className="engineer-date-block"><strong>{ticket.preferredDate}</strong><span>{ticket.preferredTime || 'Time not set'}</span></div>
              <div className="engineer-schedule-main"><strong>{ticket.ref || ticket.ticketNumber || ticket.id}</strong><span>{ticket.clientName || ticket.name || 'Customer'} · {ticket.address || 'Remote'}</span><small>{ticket.issueTitle || ticket.serviceSubCategoryLabel || ticket.serviceCategoryLabel || 'Service request'}</small></div>
              <span className={`engineer-badge tone-${ENGINEER_STATUS_META[ticket.status]?.tone || 'slate'}`}>{ENGINEER_STATUS_META[ticket.status]?.label || ticket.status}</span>
            </button>
          ))}
          {!visible.length && <div className="engineer-empty">No scheduled work is currently assigned.</div>}
        </div>
      </section>
    </>
  );
}
