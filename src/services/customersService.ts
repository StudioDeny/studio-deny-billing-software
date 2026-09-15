import { store } from './store';
import { Customer } from '../types';

export const customersService = {
  getAll: (): Customer[] => store.getState().customers,
  getById: (id: string): Customer | undefined => store.getState().customers.find((c) => c.id === id),
  create: (data: Omit<Customer, 'id' | 'ordersCount' | 'totalSpend' | 'averageOrderValue' | 'createdAt'>) =>
    store.addCustomer(data),
};
