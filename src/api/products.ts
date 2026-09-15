import { apiClient } from './client';
import { Product, Collection, InventoryLog } from '../types';
import { ProductQueryParams, PaginatedResponse } from '../types/api';

export const productsApi = {
  getAll: async (params?: ProductQueryParams): Promise<Product[]> => {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.search) query.set('search', params.search);
    if (params?.collection && params.collection !== 'ALL') query.set('collection', params.collection);
    if (params?.category) query.set('category', params.category);
    if (params?.status) query.set('status', params.status);

    const queryString = query.toString() ? `?${query.toString()}` : '';
    const res = await apiClient<Product[] | PaginatedResponse<Product>>(`/products${queryString}`);

    if (Array.isArray(res.data)) {
      return res.data;
    }
    return (res.data as any)?.items || (res.data as any)?.data || [];
  },

  getById: async (id: string): Promise<Product> => {
    const res = await apiClient<Product>(`/products/${encodeURIComponent(id)}`);
    return res.data;
  },

  create: async (data: Omit<Product, 'id' | 'totalStock'>): Promise<Product> => {
    const res = await apiClient<Product>('/products', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res.data;
  },

  update: async (id: string, updates: Partial<Product>): Promise<Product> => {
    const res = await apiClient<Product>(`/products/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
    return res.data;
  },

  getCollections: async (): Promise<Collection[]> => {
    const res = await apiClient<Collection[]>('/collections');
    return res.data;
  },

  adjustStock: async (
    productId: string,
    variantId: string,
    changeQty: number,
    reason: InventoryLog['reason'],
    note?: string
  ): Promise<InventoryLog> => {
    const res = await apiClient<InventoryLog>('/inventory/adjust', {
      method: 'POST',
      body: JSON.stringify({ productId, variantId, changeQty, reason, note }),
    });
    return res.data;
  },

  getInventoryLogs: async (productId?: string): Promise<InventoryLog[]> => {
    const query = productId ? `?productId=${encodeURIComponent(productId)}` : '';
    const res = await apiClient<InventoryLog[]>(`/inventory/logs${query}`);
    return res.data;
  },
};
