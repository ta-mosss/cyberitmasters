import { useMemo } from 'react';
import { useAuth } from './useAuth';

export function usePermissions() {
  const auth = useAuth();

  return useMemo(() => ({
    roles: auth?.roles ?? [],
    hasRole: (role) => auth?.roles?.includes(role) ?? false,
    hasAnyRole: (roles) => roles.some((role) => auth?.roles?.includes(role)),
    isStaff: auth?.isStaff ?? false,
    isManagement: auth?.isManagement ?? false
  }), [auth]);
}
