import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { hasAnyRole } from '../permissions/roles';

function LoadingGate() {
  return (
    <div className="portal-loading" role="status" aria-live="polite">
      <div className="portal-spinner" />
      <p>Loading secure workspace…</p>
    </div>
  );
}

export function RequireAuth() {
  const auth = useAuth();
  const location = useLocation();

  if (auth?.loading) return <LoadingGate />;
  if (!auth?.user) return <Navigate to={`/login?from=${encodeURIComponent(location.pathname)}`} replace />;

  return <Outlet />;
}

export function RequireRole({ roles }) {
  const auth = useAuth();
  const location = useLocation();

  if (auth?.loading) return <LoadingGate />;
  if (!auth?.user) return <Navigate to={`/login?from=${encodeURIComponent(location.pathname)}`} replace />;
  if (!hasAnyRole(auth, roles)) return <Navigate to="/portal" replace />;

  return <Outlet />;
}
