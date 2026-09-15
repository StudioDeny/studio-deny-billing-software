import { store } from './store';
import { Product } from '../types';
import { productsApi } from '../api/products';
import { ProductQueryParams } from '../types/api';

export const productsService = {
  getAll: (): Product[] => store.getState().products,
  getById: (id: string): Product | undefined => store.getState().products.find((p) => p.id === id),
  getBySku: (sku: string): Product | undefined =>
    store.getState().products.find((p) => p.sku.toLowerCase() === sku.toLowerCase()),
  create: (data: Omit<Product, 'id' | 'totalStock'>) => store.addProduct(data),
  update: (id: string, updates: Partial<Product>) => store.updateProduct(id, updates),

  // Async API methods
  fetchFromApi: async (params?: ProductQueryParams): Promise<Product[]> => {
    return await productsApi.getAll(params);
  },
  fetchByIdFromApi: async (id: string): Promise<Product> => {
    return await productsApi.getById(id);
  },
  createOnApi: async (data: Omit<Product, 'id' | 'totalStock'>): Promise<Product> => {
    return await productsApi.create(data);
  },
  updateOnApi: async (id: string, updates: Partial<Product>): Promise<Product> => {
    return await productsApi.update(id, updates);
  },
};
