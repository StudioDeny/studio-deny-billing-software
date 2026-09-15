import { store } from './store';
import { Order, FulfillmentStatus } from '../types';

export const ordersService = {
  getAll: (): Order[] => store.getState().orders,
  getById: (id: string): Order | undefined =>
    store.getState().orders.find((o) => o.id === id || o.orderNumber === id),
  create: (data: Omit<Order, 'id' | 'orderNumber' | 'createdAt' | 'timeline'>) => store.createOrder(data),
  updateFulfillment: (orderId: string, status: FulfillmentStatus, courier?: string, tracking?: string) =>
    store.updateFulfillmentStatus(orderId, status, courier, tracking),
};
