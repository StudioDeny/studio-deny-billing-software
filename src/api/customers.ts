import { apiClient } from './client';
import { Customer, Order } from '../types';
import { CustomerQueryParams, PaginatedResponse } from '../types/api';

export const customersApi = {
  getAll: async (params?: CustomerQueryParams): Promise<Customer[]> => {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.search) query.set('search', params.search);
    if (params?.segment && params.segment !== 'ALL') query.set('segment', params.segment);

    const queryString = query.toString() ? `?${query.toString()}` : '';
    const res = await apiClient<Customer[] | PaginatedResponse<Customer>>(`/customers${queryString}`);

    if (Array.isArray(res.data)) {
      return res.data;
    }
    return (res.data as any)?.items || (res.data as any)?.data || [];
  },

  getById: async (id: string): Promise<Customer> => {
    const res = await apiClient<Customer>(`/customers/${encodeURIComponent(id)}`);
    return res.data;
  },

  create: async (
    data: Omit<Customer, 'id' | 'ordersCount' | 'totalSpend' | 'averageOrderValue' | 'createdAt'>
  ): Promise<Customer> => {
    const res = await apiClient<Customer>('/customers', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res.data;
  },

  getCustomerOrders: async (customerId: string): Promise<Order[]> => {
    const res = await apiClient<Order[]>(`/customers/${encodeURIComponent(customerId)}/orders`);
    return res.data;
  },
};
