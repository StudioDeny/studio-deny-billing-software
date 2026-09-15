import { apiClient } from './client';
import { Order, FulfillmentStatus, PaymentTransaction, ReturnRequest, ReturnStatus } from '../types';
import { OrderQueryParams, PaginatedResponse, ApiResponse } from '../types/api';

export const ordersApi = {
  getAll: async (params?: OrderQueryParams): Promise<Order[]> => {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.search) query.set('search', params.search);
    if (params?.channel && params.channel !== 'ALL') query.set('channel', params.channel);
    if (params?.paymentMethod && params.paymentMethod !== 'ALL') query.set('paymentMethod', params.paymentMethod);
    if (params?.startDate) query.set('startDate', params.startDate);
    if (params?.endDate) query.set('endDate', params.endDate);

    const queryString = query.toString() ? `?${query.toString()}` : '';
    const res = await apiClient<Order[] | PaginatedResponse<Order>>(`/orders${queryString}`);
    
    // Support both direct array data and paginated data envelope
    if (Array.isArray(res.data)) {
      return res.data;
    }
    return (res.data as any)?.items || (res.data as any)?.data || [];
  },

  getById: async (id: string): Promise<Order> => {
    const res = await apiClient<Order>(`/orders/${encodeURIComponent(id)}`);
    return res.data;
  },

  create: async (data: Omit<Order, 'id' | 'orderNumber' | 'createdAt' | 'timeline'>): Promise<Order> => {
    const idempotencyKey = crypto.randomUUID();
    const res = await apiClient<Order>('/orders', {
      method: 'POST',
      idempotencyKey,
      body: JSON.stringify(data),
    });
    return res.data;
  },

  updateFulfillment: async (
    orderId: string,
    status: FulfillmentStatus,
    courierName?: string,
    trackingNumber?: string
  ): Promise<Order> => {
    const res = await apiClient<Order>(`/orders/${encodeURIComponent(orderId)}/fulfillment`, {
      method: 'PATCH',
      body: JSON.stringify({ status, courierName, trackingNumber }),
    });
    return res.data;
  },

  getPayments: async (orderId?: string): Promise<PaymentTransaction[]> => {
    const query = orderId ? `?orderId=${encodeURIComponent(orderId)}` : '';
    const res = await apiClient<PaymentTransaction[]>(`/payments${query}`);
    return res.data;
  },

  getReturns: async (): Promise<ReturnRequest[]> => {
    const res = await apiClient<ReturnRequest[]>('/returns');
    return res.data;
  },

  updateReturnStatus: async (returnId: string, status: ReturnStatus): Promise<ReturnRequest> => {
    const res = await apiClient<ReturnRequest>(`/returns/${encodeURIComponent(returnId)}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    return res.data;
  },

  createReturn: async (
    data: Omit<ReturnRequest, 'id' | 'returnNumber' | 'createdAt' | 'status'>
  ): Promise<ReturnRequest> => {
    const res = await apiClient<ReturnRequest>('/returns', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res.data;
  },
};
