import { store } from './store';
import { Order } from '../types';

export const invoicesService = {
  getAll: () => store.getState().orders,
  getById: (id: string): Order | undefined => store.getState().orders.find((o) => o.id === id || o.orderNumber === id),
  getByCustomerId: (customerId: string): Order[] => store.getState().orders.filter((o) => o.customerId === customerId),
};
