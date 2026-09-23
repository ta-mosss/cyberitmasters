import { useEffect, useMemo, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { getRoleLabel } from '../../permissions/roles';
import {
  ACTIVE_ENGINEER_STATUSES,
  subscribeToEngineerTickets,
} from '../../services/tickets/engineer';

export default function EngineerPortalPage() {
  const auth = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [tickets, setTickets] = useState([]);
  const [loadError, setLoadError] = useState('');
  const [loading, setLoading] = useState(true);

  const engineerName = auth?.profile?.name
    || auth?.profile?.fullName
    || auth?.user?.displayName
    || auth?.user?.email
    || '';

  useEffect(() => {
    if (!auth?.user?.uid) return undefined;
    setLoading(true);
    setLoadError('');

    const unsubscribe = subscribeToEngineerTickets(
      auth.user.uid,
      engineerName,
      (next) => {
        setTickets(next);
        setLoading(false);
      },
      (error) => {
        console.error(error);
        setLoadError('Unable to load assigned work. Check your network connection and permissions.');
        setLoading(false);
      },
    );

    return unsubscribe;
  }, [auth?.user?.uid, engineerName]);

  const stats = useMemo(() => ({
    assigned: tickets.length,
    active: tickets.filter((ticket) => ACTIVE_ENGINEER_STATUSES.includes(ticket.status)).length,
    urgent: tickets.filter((ticket) => ticket.priority === 'urgent').length,
    inProgress: tickets.filter((ticket) => ticket.status === 'in-progress').length,
    resolved: tickets.filter((ticket) => ticket.status === 'resolved').length,
  }), [tickets]);

  if (loading) {
    return <div className="portal-loading"><div className="portal-spinner" /><p>Loading Engineer Portal…</p></div>;
  }

  const isDashboard = location.pathname === '/engineer' || location.pathname === '/engineer/';

  return (
    <div className="engineer-shell">
      <header className="engineer-header">
        <div className="engineer-brand-wrap">
          <img src="/logo.png" alt="Cyber I.T Masters" />
          <div>
            <strong>CYBER I.T MASTERS</strong>
            <span>ENGINEER OPERATIONS</span>
          </div>
        </div>
        <div className="engineer-header-actions">
          <span className="engineer-secure"><i /> {getRoleLabel(auth?.role)}</span>
          <button className="engineer-btn engineer-btn-secondary" type="button" onClick={() => auth.logout()}>Sign out</button>
        </div>
      </header>

      <div className="engineer-layout">
        <aside className="engineer-sidebar">
          <div className="engineer-profile-mini">
            <div className="engineer-avatar">{engineerName.slice(0, 1).toUpperCase() || 'E'}</div>
            <div><strong>{engineerName}</strong><small>{auth?.user?.email}</small></div>
          </div>

          <nav>
            <NavLink to="/engineer" end>🛠 Assigned Work</NavLink>
            <NavLink to="/engineer/schedule">📅 Schedule</NavLink>
            <NavLink to="/engineer/history">🧾 Completed Work</NavLink>
            <NavLink to="/engineer/profile">👤 My Profile</NavLink>
          </nav>

          <div className="engineer-sidebar-note">
            <strong>Field-service rule</strong>
            <span>Record work, notes and customer-facing evidence against the assigned ticket.</span>
            <button type="button" onClick={() => navigate('/portal')}>Open workspace →</button>
          </div>
        </aside>

        <main className="engineer-main">
          {loadError && <div className="engineer-alert" role="alert">{loadError}</div>}

          {isDashboard && (
            <section className="engineer-hero">
              <div>
                <p className="engineer-eyebrow">ENGINEER WORKSPACE</p>
                <h1>Good to see you, {engineerName.split(' ')[0] || 'Engineer'}.</h1>
                <p>Manage assigned service requests, document field work and hand completed jobs back to the customer securely.</p>
              </div>
              <div className="engineer-live-chip"><i /> Live service queue</div>
            </section>
          )}

          {isDashboard && (
            <section className="engineer-stat-grid" aria-label="Engineer workload summary">
              <Stat label="Assigned" value={stats.assigned} icon="🎫" />
              <Stat label="Active" value={stats.active} icon="🔧" />
              <Stat label="Urgent" value={stats.urgent} icon="⚠" />
              <Stat label="In Progress" value={stats.inProgress} icon="◐" />
              <Stat label="Resolved" value={stats.resolved} icon="✓" />
            </section>
          )}

          <Outlet context={{
            tickets,
            setTickets,
            engineerName,
            engineerId: auth?.user?.uid,
            auth,
            loading,
          }} />
        </main>
      </div>
    </div>
  );
}

function Stat({ label, value, icon }) {
  return <article className="engineer-stat"><div>{icon}</div><strong>{value}</strong><span>{label}</span></article>;
}
