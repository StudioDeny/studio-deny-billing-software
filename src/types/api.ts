/**
 * Standard API Envelope and Contract Types
 * Studio Deny Commerce OS
 */

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  errors?: Record<string, string[]>;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  message?: string;
  meta: PaginationMeta;
}

export interface ApiErrorResponse {
  success: false;
  data: null;
  message: string;
  errors?: Record<string, string[]>;
  statusCode?: number;
}

export interface AuthSessionUser {
  id: string;
  name: string;
  email: string;
  role: 'OWNER' | 'MANAGER' | 'BILLING' | 'ADMIN' | 'FULFILLMENT';
  permissions: string[];
}

export interface AuthLoginResponse {
  user: AuthSessionUser;
  accessToken: string;
  expiresIn: number;
}

export interface OrderQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  channel?: 'ALL' | 'OFFLINE' | 'ONLINE';
  paymentMethod?: string;
  startDate?: string;
  endDate?: string;
}

export interface ProductQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  collection?: string;
  category?: string;
  status?: string;
}

export interface CustomerQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  segment?: string;
}

export interface SalesAuditSummary {
  period: string;
  offline: {
    totalBills: number;
    grossSales: number;
    totalDiscounts: number;
    totalTax: number;
    netRevenue: number;
    aov: number;
    cashTendered: number;
    cashChangeReturned: number;
    netCashInDrawer: number;
  };
  online: {
    totalOrders: number;
    grossSales: number;
    totalDiscounts: number;
    totalTax: number;
    shippingCollected: number;
    netRevenue: number;
    aov: number;
  };
  consolidated: {
    totalTransactions: number;
    totalGross: number;
    totalDiscounts: number;
    totalTax: number;
    totalNetRevenue: number;
  };
}
