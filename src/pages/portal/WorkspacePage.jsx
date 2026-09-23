import { Link } from 'react-router-dom';
import { PortalFrame, LegacyPortalButton } from '../../components/portal/PortalFrame';
import { useAuth } from '../../hooks/useAuth';
import { getRoleLabel } from '../../permissions/roles';

const cards = [
  { path: '/management', title: 'Management', text: 'Operations, service desk, dispatch, SLA and reporting.' },
  { path: '/engineer', title: 'Engineer', text: 'Engineer workload, tickets, jobs and field operations.' },
  { path: '/customer', title: 'Customer', text: 'Customer-facing service desk and sign-off experience.' },
  { path: '/admin', title: 'Admin', text: 'Users, roles, configuration and system controls.' }
];

export default function WorkspacePage() {
  const auth = useAuth();

  return (
    <PortalFrame title="Operations workspace">
      <section className="portal-hero-card">
        <div>
          <p className="portal-kicker">PHASE 3 FOUNDATION</p>
          <h2>Welcome back, {auth?.profile?.displayName || auth?.user?.email?.split('@')[0] || 'operator'}.</h2>
          <p>The new React/Vite shell is active. Your current role is <strong>{getRoleLabel(auth?.role)}</strong>. Portal modules will be migrated here one domain at a time.</p>
        </div>
        <div className="portal-chip">{getRoleLabel(auth?.role)}</div>
      </section>

      <section className="portal-grid">
        {cards.map((card) => (
          <Link key={card.path} className="portal-card" to={card.path}>
            <span className="portal-card-label">MODULE</span>
            <h3>{card.title}</h3>
            <p>{card.text}</p>
            <span>Open module →</span>
          </Link>
        ))}
      </section>

      <section className="portal-migration-card">
        <div>
          <p className="portal-kicker">MIGRATION BRIDGE</p>
          <h2>Legacy operational portals are still preserved.</h2>
          <p>This lets us migrate functionality progressively instead of cutting over the service desk in one risky release.</p>
        </div>
        <div className="portal-button-row">
          <LegacyPortalButton href="management.html" label="Legacy management" />
          <LegacyPortalButton href="engineer.html" label="Legacy engineer" />
          <LegacyPortalButton href="client.html" label="Legacy customer" />
        </div>
      </section>
    </PortalFrame>
  );
}
