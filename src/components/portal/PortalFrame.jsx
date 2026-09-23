import { Link, NavLink } from 'react-router-dom';
import { getRoleLabel } from '../../permissions/roles';
import { useAuth } from '../../hooks/useAuth';

const baseNav = [
  ['/portal', 'Workspace'],
  ['/management', 'Management'],
  ['/engineer', 'Engineer'],
  ['/customer', 'Customer'],
  ['/admin', 'Admin']
];

export function PortalFrame({ title, eyebrow = 'CYBER I.T MASTERS', children }) {
  const auth = useAuth();
  const roles = auth?.roles ?? [];

  const allowed = baseNav.filter(([, label]) => {
    if (label === 'Admin') return roles.includes('super_admin');
    if (label === 'Management') return roles.some((r) => ['super_admin', 'operations_manager', 'service_manager', 'dispatcher', 'finance'].includes(r));
    if (label === 'Engineer') return roles.some((r) => ['super_admin', 'operations_manager', 'service_manager', 'engineer'].includes(r));
    if (label === 'Customer') return roles.includes('customer');
    return true;
  });

  return (
    <div className="portal-app">
      <header className="portal-header">
        <Link className="portal-brand" to="/portal">
          <img src="/logo.png" alt="" aria-hidden="true" />
          <span><strong>CYBER</strong> I.T MASTERS<small>PRODUCTION OPERATIONS PLATFORM</small></span>
        </Link>
        <div className="portal-user">
          <span>{auth?.user?.email}</span>
          <strong>{getRoleLabel(auth?.role)}</strong>
          <button type="button" onClick={() => auth?.logout()}>Sign out</button>
        </div>
      </header>

      <div className="portal-body">
        <aside className="portal-sidebar" aria-label="Portal navigation">
          <div className="portal-sidebar-title">{eyebrow}</div>
          <nav>
            {allowed.map(([to, label]) => (
              <NavLink key={to} to={to} end={to === '/portal'}>
                {label}
              </NavLink>
            ))}
          </nav>
          <div className="portal-legacy-note">
            <small>Migration mode</small>
            <span>Legacy portals remain available while each module is rebuilt in React.</span>
          </div>
        </aside>

        <main className="portal-main">
          <div className="portal-heading">
            <p>{eyebrow}</p>
            <h1>{title}</h1>
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}

export function LegacyPortalButton({ href, label = 'Open legacy portal' }) {
  const normalized = href.startsWith('/') ? href : `/${href}`;
  const path = `${import.meta.env.BASE_URL || '/'}${normalized.replace(/^\//, '')}`;

  return (
    <a className="portal-button portal-button-secondary" href={path}>
      {label} ↗
    </a>
  );
}
