import { store } from './store';
import { Product } from '../types';

export const productsService = {
  getAll: (): Product[] => store.getState().products,
  getById: (id: string): Product | undefined => store.getState().products.find((p) => p.id === id),
  getBySku: (sku: string): Product | undefined =>
    store.getState().products.find((p) => p.sku.toLowerCase() === sku.toLowerCase()),
  create: (data: Omit<Product, 'id' | 'totalStock'>) => store.addProduct(data),
  update: (id: string, updates: Partial<Product>) => store.updateProduct(id, updates),
};
