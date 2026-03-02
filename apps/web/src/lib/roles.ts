export type Role = 'SUPER_ADMIN' | 'ADMIN' | 'MANAGER' | 'CASHIER'

export const canManageProducts = (role: Role) =>
  ['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(role)

export const canManageBranches = (role: Role) =>
  ['SUPER_ADMIN', 'ADMIN'].includes(role)

export const canViewReports = (role: Role) =>
  ['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(role)

export const canCancelTransaction = (role: Role) =>
  ['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(role)