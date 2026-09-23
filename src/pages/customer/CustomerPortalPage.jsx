import { useEffect, useMemo, useState } from 'react';
import { Link, NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import {
  getCustomerProfile, saveCustomerProfile, subscribeToCustomerTickets,
} from '../../services/tickets/customer';

export default function CustomerPortalPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [profile, setProfile] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [loadError, setLoadError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    if (!auth?.user?.uid) return undefined;

    (async () => {
      try {
        const nextProfile = await getCustomerProfile(auth.user.uid, {
          name: auth.user.displayName || 'Customer',
          email: auth.user.email || '',
        });
        if (mounted) {
          setProfile(nextProfile);
          setLoading(false);
        }
      } catch (error) {
        if (mounted) {
          setLoadError(error.message || 'Unable to load your customer profile.');
          setLoading(false);
        }
      }
    })();

    const unsubscribe = subscribeToCustomerTickets(auth.user.uid, setTickets, (error) => {
      console.error(error);
      setLoadError('Unable to load your tickets. Please refresh and try again.');
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [auth?.user?.uid, auth?.user?.displayName, auth?.user?.email]);

  const stats = useMemo(() => ({
    total: tickets.length,
    active: tickets.filter((ticket) => !['resolved', 'closed'].includes(ticket.status)).length,
    signoff: tickets.filter((ticket) => ticket.status === 'awaiting-signoff').length,
    closed: tickets.filter((ticket) => ticket.status === 'closed').length,
  }), [tickets]);

  const goToNewRequest = () => navigate('/customer/request');

  const saveProfile = async (updates) => {
    await saveCustomerProfile(auth.user.uid, updates);
    setProfile((current) => ({ ...current, ...updates }));
  };

  if (loading) {
    return <div className="portal-loading"><div className="portal-spinner" /><p>Loading Customer Portal…</p></div>;
  }

  const isDashboard = location.pathname === '/customer' || location.pathname === '/customer/';

  return (
    <div className="customer-shell">
      <header className="customer-header">
        <Link to="/customer" className="customer-brand">
          <img src="/logo.png" alt="Cyber I.T Masters" />
          <span><strong>CYBER</strong> I.T MASTERS<small>CUSTOMER SERVICE DESK</small></span>
        </Link>
        <div className="customer-header-actions">
          <span className="customer-secure"><i /> Secure session</span>
          <button type="button" className="portal-button portal-button-secondary" onClick={() => auth.logout()}>Sign out</button>
        </div>
      </header>

      <div className="customer-layout">
        <aside className="customer-sidebar">
          <div className="customer-profile-mini">
            <div className="customer-avatar">{(profile?.name || auth.user.email || 'C').slice(0, 1).toUpperCase()}</div>
            <div><strong>{profile?.name || auth.user.displayName || 'Customer'}</strong><small>{profile?.company || auth.user.email}</small></div>
          </div>
          <nav>
            <NavLink to="/customer" end>Overview</NavLink>
            <NavLink to="/customer/tickets">My Tickets</NavLink>
            <NavLink to="/customer/request">New Request</NavLink>
            <NavLink to="/customer/assets">Assets</NavLink>
            <NavLink to="/customer/billing">Quotes & Invoices</NavLink>
            <NavLink to="/customer/profile">My Profile</NavLink>
          </nav>
          <div className="customer-sidebar-note">
            <strong>Need help now?</strong>
            <span>Use your ticket reference when contacting support.</span>
            <a href="https://wa.me/27726650565" target="_blank" rel="noreferrer">WhatsApp support ↗</a>
          </div>
        </aside>

        <main className="customer-main">
          {loadError && <div className="customer-alert error" role="alert">{loadError}</div>}

          {isDashboard && (
            <section className="customer-hero-card">
              <div>
                <p className="portal-eyebrow">CUSTOMER WORKSPACE</p>
                <h1>Welcome back, {profile?.name || auth.user.displayName || 'Customer'}.</h1>
                <p>Track service requests, review work completed by our engineers and manage your support account.</p>
              </div>
              <button type="button" className="portal-button" onClick={goToNewRequest}>+ New Service Request</button>
            </section>
          )}

          {isDashboard && (
            <section className="customer-stat-grid" aria-label="Service desk summary">
              <StatCard label="Total Tickets" value={stats.total} icon="🎫" />
              <StatCard label="Active" value={stats.active} icon="🔧" />
              <StatCard label="Awaiting Sign-Off" value={stats.signoff} icon="✎" />
              <StatCard label="Closed" value={stats.closed} icon="✓" />
            </section>
          )}

          <Outlet context={{ profile, setProfile, saveProfile, tickets, stats }} />
        </main>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon }) {
  return <article className="customer-stat-card"><div className="customer-stat-icon">{icon}</div><strong>{value}</strong><span>{label}</span></article>;
}
