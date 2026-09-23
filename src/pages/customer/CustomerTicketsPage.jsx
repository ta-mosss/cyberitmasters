import { useMemo } from 'react';
import { useOutletContext, useSearchParams } from 'react-router-dom';
import TicketList from './TicketList';

export default function CustomerTicketsPage() {
  const { tickets } = useOutletContext();
  const [params, setParams] = useSearchParams();
  const filter = params.get('filter') || 'all';
  const filtered = useMemo(() => {
    if (filter === 'active') return tickets.filter((ticket) => !['resolved', 'closed'].includes(ticket.status));
    if (filter === 'signoff') return tickets.filter((ticket) => ticket.status === 'awaiting-signoff');
    if (filter === 'closed') return tickets.filter((ticket) => ticket.status === 'closed');
    return tickets;
  }, [filter, tickets]);
  return <div className="customer-page-stack"><div className="customer-section-head"><div><p className="portal-eyebrow">SUPPORT HISTORY</p><h2>My Tickets</h2></div><div className="customer-filter-tabs">{[['all','All'],['active','Active'],['signoff','Awaiting Sign-Off'],['closed','Closed']].map(([value,label]) => <button key={value} className={filter === value ? 'active' : ''} onClick={() => setParams(value === 'all' ? {} : { filter: value })}>{label}</button>)}</div></div><TicketList tickets={filtered} /></div>;
}
