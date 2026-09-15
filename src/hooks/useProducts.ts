import { useState, useEffect, useCallback } from 'react';
import { Product, Collection, InventoryLog } from '../types';
import { productsApi } from '../api/products';
import { store } from '../services/store';
import { ProductQueryParams } from '../types/api';

const ENABLE_MOCK_FALLBACK = import.meta.env.VITE_ENABLE_MOCK_FALLBACK === 'true';

export function useProducts(params?: ProductQueryParams) {
  const [products, setProducts] = useState<Product[]>(() => store.getState().products);
  const [collections, setCollections] = useState<Collection[]>(() => store.getState().collections);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCatalog = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [prodsData, collesData] = await Promise.all([
        productsApi.getAll(params),
        productsApi.getCollections().catch(() => store.getState().collections),
      ]);
      setProducts(prodsData);
      setCollections(collesData);
    } catch (err: any) {
      if (ENABLE_MOCK_FALLBACK) {
        console.info('[useProducts] Falling back to local store catalog.');
        setProducts(store.getState().products);
        setCollections(store.getState().collections);
      } else {
        setError(err.message || 'Failed to load catalog from server.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [params?.collection, params?.category, params?.search]);

  useEffect(() => {
    fetchCatalog();

    const unsub = store.subscribe((state) => {
      if (ENABLE_MOCK_FALLBACK) {
        setProducts(state.products);
        setCollections(state.collections);
      }
    });

    return unsub;
  }, [fetchCatalog]);

  const createProduct = useCallback(
    async (data: Omit<Product, 'id' | 'totalStock'>): Promise<Product> => {
      try {
        const created = await productsApi.create(data);
        setProducts((prev) => [created, ...prev]);
        store.addToast('Product Created', `${created.name} (${created.sku}) saved to catalog.`, 'success');
        return created;
      } catch (err: any) {
        if (ENABLE_MOCK_FALLBACK) {
          const fallback = store.addProduct(data);
          setProducts((prev) => [fallback, ...prev]);
          return fallback;
        }
        store.addToast('Creation Error', err.message || 'Could not save product.', 'error');
        throw err;
      }
    },
    []
  );

  const updateProduct = useCallback(
    async (id: string, updates: Partial<Product>): Promise<Product | void> => {
      try {
        const updated = await productsApi.update(id, updates);
        setProducts((prev) => prev.map((p) => (p.id === id ? updated : p)));
        store.addToast('Product Updated', 'Catalog changes saved.', 'info');
        return updated;
      } catch (err: any) {
        if (ENABLE_MOCK_FALLBACK) {
          store.updateProduct(id, updates);
          setProducts(store.getState().products);
          return;
        }
        store.addToast('Save Failed', err.message || 'Could not update product.', 'error');
        throw err;
      }
    },
    []
  );

  const adjustStock = useCallback(
    async (
      productId: string,
      variantId: string,
      changeQty: number,
      reason: InventoryLog['reason'] = 'ADJUSTMENT',
      note?: string
    ) => {
      try {
        await productsApi.adjustStock(productId, variantId, changeQty, reason, note);
        await fetchCatalog();
        store.addToast('Stock Adjusted', `Inventory updated on server.`, 'info');
      } catch (err: any) {
        if (ENABLE_MOCK_FALLBACK) {
          store.adjustStock(productId, variantId, changeQty, reason);
          setProducts(store.getState().products);
          return;
        }
        store.addToast('Adjustment Failed', err.message || 'Could not adjust stock.', 'error');
        throw err;
      }
    },
    [fetchCatalog]
  );

  return {
    products,
    collections,
    isLoading,
    error,
    refetch: fetchCatalog,
    createProduct,
    updateProduct,
    adjustStock,
  };
}
