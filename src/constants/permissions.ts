// The 4 real POS roles backed by the pos_role DB enum. StaffRole (app-wide
// type) also has a legacy 'ADMIN' value that has no DB-level POS role.
export type DbStaffRole = 'OWNER' | 'MANAGER' | 'BILLING' | 'FULFILLMENT';

export type PermissionKey =
  | 'DASHBOARD'
  | 'BILLING'
  | 'BILLS'
  | 'TAGS'
  | 'AUDIT'
  | 'PRODUCTS'
  | 'CUSTOMERS'
  | 'SETTINGS';

export const ALL_PERMISSIONS: PermissionKey[] = [
  'DASHBOARD',
  'BILLING',
  'BILLS',
  'TAGS',
  'AUDIT',
  'PRODUCTS',
  'CUSTOMERS',
  'SETTINGS',
];

export const PERMISSION_LABELS: Record<PermissionKey, string> = {
  DASHBOARD: 'Dashboard',
  BILLING: 'New Bill (POS Terminal)',
  BILLS: 'Bills & Transaction History',
  TAGS: 'Price Tag Generator',
  AUDIT: 'Sales Audit & Channel Reconciliation',
  PRODUCTS: 'Products & Inventory',
  CUSTOMERS: 'Customer Directory',
  SETTINGS: 'Terminal Settings & Staff Management',
};

export const DEFAULT_PERMISSIONS_BY_ROLE: Record<DbStaffRole, PermissionKey[]> = {
  OWNER: [...ALL_PERMISSIONS],
  MANAGER: ['DASHBOARD', 'BILLING', 'BILLS', 'TAGS', 'AUDIT', 'PRODUCTS', 'CUSTOMERS'],
  BILLING: ['DASHBOARD', 'BILLING', 'BILLS', 'CUSTOMERS'],
  FULFILLMENT: ['DASHBOARD', 'BILLS'],
};

// user_roles is the DB-level access gate (RLS); it only distinguishes
// admin/staff, both of which currently get identical table access via
// is_admin_or_staff(). OWNER/MANAGER also get 'admin' so they can create
// and manage other staff members (pos_staff insert/update requires is_admin()).
export function dbRoleForStaffRole(role: DbStaffRole): 'admin' | 'staff' {
  return role === 'OWNER' || role === 'MANAGER' ? 'admin' : 'staff';
}
