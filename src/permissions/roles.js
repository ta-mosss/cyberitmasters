export const ROLE_LABELS = {
  super_admin: 'Super Admin',
  operations_manager: 'Operations Manager',
  service_manager: 'Service Manager',
  dispatcher: 'Dispatcher',
  finance: 'Finance',
  engineer: 'Engineer',
  support_agent: 'Support Agent',
  customer: 'Customer'
};

export const PORTAL_ROLES = {
  admin: ['super_admin'],
  management: ['super_admin', 'operations_manager', 'service_manager', 'dispatcher', 'finance'],
  engineer: ['super_admin', 'operations_manager', 'service_manager', 'engineer'],
  support: ['super_admin', 'operations_manager', 'service_manager', 'support_agent'],
  customer: ['customer']
};

export function getRoleLabel(role) {
  return ROLE_LABELS[role] ?? role ?? 'User';
}

export function hasAnyRole(userContext, allowedRoles = []) {
  if (!userContext) return false;
  return userContext.roles?.some((role) => allowedRoles.includes(role)) ?? false;
}
