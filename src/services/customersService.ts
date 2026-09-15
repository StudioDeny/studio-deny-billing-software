import { store } from './store';
import { Customer } from '../types';
import { customersApi } from '../api/customers';
import { CustomerQueryParams } from '../types/api';

export const customersService = {
  getAll: (): Customer[] => store.getState().customers,
  getById: (id: string): Customer | undefined => store.getState().customers.find((c) => c.id === id),
  create: (data: Omit<Customer, 'id' | 'ordersCount' | 'totalSpend' | 'averageOrderValue' | 'createdAt'>) =>
    store.addCustomer(data),

  // Async API methods
  fetchFromApi: async (params?: CustomerQueryParams): Promise<Customer[]> => {
    return await customersApi.getAll(params);
  },
  fetchByIdFromApi: async (id: string): Promise<Customer> => {
    return await customersApi.getById(id);
  },
  createOnApi: async (
    data: Omit<Customer, 'id' | 'ordersCount' | 'totalSpend' | 'averageOrderValue' | 'createdAt'>
  ): Promise<Customer> => {
    return await customersApi.create(data);
  },
};
