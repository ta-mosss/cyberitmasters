import { useEffect, useMemo, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { getRoleLabel } from '../../permissions/roles';
import {
  MANAGEMENT_NAV,
  isFinanceRole,
  isManagementRole,
  subscribeToOperationsData,
} from '../../services/management/operations';
import '../../styles/management.css';

export default function ManagementPortalPage() {
  const auth = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [data, setData] = useState({ tickets: [], jobs: [], engineers: [], customers: [], assets: [], quotes: [], auditLogs: [] });
  const [loading, setLoading] = useState(true);
  const [loadErrors, setLoadErrors] = useState([]);

  useEffect(() => {
    const unsubscribe = subscribeToOperationsData((key, rows) => {
      setData((current) => ({ ...current, [key]: rows }));
      setLoading(false);
    }, (key, error) => {
      console.error(`Management data error [${key}]`, error);
      setLoadErrors((current) => current.includes(key) ? current : [...current, key]);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const activeNav = useMemo(() => {
    const segment = location.pathname.split('/')[2] || 'dashboard';
    return MANAGEMENT_NAV.some((item) => item.key === segment) ? segment : 'dashboard';
  }, [location.pathname]);

  const stats = useMemo(() => {
    const activeTickets = data.tickets.filter((ticket) => !['resolved', 'closed'].includes(String(ticket.status || '').toLowerCase()));
    const openDispatch = data.jobs.filter((job) => !job.assignedEngineer || job.assignedEngineer === 'Unassigned');
    const urgent = data.tickets.filter((ticket) => String(ticket.priority || '').toLowerCase() === 'urgent');
    return {
      tickets: data.tickets.length,
      activeTickets: activeTickets.length,
      jobs: data.jobs.length,
      dispatch: openDispatch.length,
      engineers: data.engineers.filter((person) => person.active !== false).length,
      urgent: urgent.length,
      overdue: data.tickets.filter((ticket) => ['overdue', 'breached'].includes(String(ticket.slaStatus || '').toLowerCase())).length,
    };
  }, [data]);

  const displayName = auth?.profile?.name || auth?.profile?.displayName || auth?.user?.displayName || auth?.user?.email || 'Operations';
  const canWrite = isManagementRole(auth?.role);
  const financeOnly = isFinanceRole(auth?.role);

  return (
    <div className="management-shell">
      <header className="management-topbar">
        <button className="management-brand" type="button" onClick={() => navigate('/management')}>
          <span className="management-brand-mark">CI</span>
          <span><strong>CYBER I.T MASTERS</strong><small>OPERATIONS CONSOLE</small></span>
        </button>
        <div className="management-top-actions">
          <span className="management-live"><i /> Live operations</span>
          <span className="management-role">{getRoleLabel(auth?.role)}</span>
          <button className="management-logout" type="button" onClick={() => auth.logout()}>Sign out</button>
        </div>
      </header>

      <div className="management-body">
        <aside className="management-sidebar">
          <div className="management-user-card">
            <div className="management-avatar">{displayName.slice(0, 1).toUpperCase()}</div>
            <div><strong>{displayName}</strong><span>{auth?.user?.email}</span></div>
          </div>
          <div className="management-section-label">OPERATIONS</div>
          <nav className="management-nav">
            {MANAGEMENT_NAV.map((item) => (
              <NavLink key={item.key} to={`/management/${item.key === 'dashboard' ? '' : item.key}`} end={item.key === 'dashboard'}>
                <span>{item.icon}</span>{item.label}
              </NavLink>
            ))}
          </nav>
          <div className="management-side-summary">
            <span>ACTIVE TICKETS</span><strong>{stats.activeTickets}</strong>
            <span>SLA ATTENTION</span><strong>{stats.overdue}</strong>
            <button type="button" onClick={() => navigate('/portal')}>Open workspace →</button>
          </div>
        </aside>

        <main className="management-main">
          {(financeOnly || !canWrite) && (
            <div className="management-banner management-banner-info">
              {financeOnly ? 'Finance access is read-only here. Commercial workflows can be reviewed; operational writes remain manager-controlled.' : 'Your role can view operations, but manager-level changes are restricted by the backend.'}
            </div>
          )}
          {loadErrors.length > 0 && (
            <div className="management-banner management-banner-warn">
              Some operational feeds could not be loaded: {loadErrors.join(', ')}. The portal will continue using the data that is available.
            </div>
          )}

          <div className="management-page-heading">
            <div><span>OPERATIONS CONTROL</span><h1>{MANAGEMENT_NAV.find((item) => item.key === activeNav)?.label || 'Operations'}</h1></div>
            <div className="management-heading-stats">
              <Metric label="Tickets" value={stats.tickets} />
              <Metric label="Jobs" value={stats.jobs} />
              <Metric label="Dispatch" value={stats.dispatch} />
              <Metric label="Urgent" value={stats.urgent} />
            </div>
          </div>

          {loading ? <div className="management-loading"><div className="management-spinner" /><p>Loading live operations data…</p></div> : (
            <Outlet context={{ auth, data, stats, canWrite, displayName, refreshable: true }} />
          )}
        </main>
      </div>
    </div>
  );
}

function Metric({ label, value }) {
  return <div className="management-heading-metric"><span>{label}</span><strong>{value}</strong></div>;
}
