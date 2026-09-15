import { store } from './store';
import { Order, FulfillmentStatus } from '../types';
import { ordersApi } from '../api/orders';
import { OrderQueryParams } from '../types/api';

export const ordersService = {
  // Sync in-memory getter for legacy components
  getAll: (): Order[] => store.getState().orders,
  getById: (id: string): Order | undefined =>
    store.getState().orders.find((o) => o.id === id || o.orderNumber === id),
  
  // Async API methods
  fetchFromApi: async (params?: OrderQueryParams): Promise<Order[]> => {
    return await ordersApi.getAll(params);
  },
  fetchByIdFromApi: async (id: string): Promise<Order> => {
    return await ordersApi.getById(id);
  },
  create: (data: Omit<Order, 'id' | 'orderNumber' | 'createdAt' | 'timeline'>) => store.createOrder(data),
  createOnApi: async (data: Omit<Order, 'id' | 'orderNumber' | 'createdAt' | 'timeline'>): Promise<Order> => {
    return await ordersApi.create(data);
  },
  updateFulfillment: (orderId: string, status: FulfillmentStatus, courier?: string, tracking?: string) =>
    store.updateFulfillmentStatus(orderId, status, courier, tracking),
  updateFulfillmentOnApi: async (orderId: string, status: FulfillmentStatus, courier?: string, tracking?: string) => {
    return await ordersApi.updateFulfillment(orderId, status, courier, tracking);
  },
};
