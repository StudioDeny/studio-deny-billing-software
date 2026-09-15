import { apiClient } from './client';
import { SalesAuditSummary } from '../types/api';

export const reportsApi = {
  getSalesAudit: async (timeRange: 'ALL' | 'TODAY' | 'WEEK' | 'MONTH' = 'ALL'): Promise<SalesAuditSummary> => {
    const res = await apiClient<SalesAuditSummary>(`/reports/sales-audit?timeRange=${timeRange}`);
    return res.data;
  },
};
