import { useState, useEffect, useCallback } from 'react';
import { Order, FulfillmentStatus } from '../types';
import { ordersApi } from '../api/orders';
import { store } from '../services/store';
import { OrderQueryParams } from '../types/api';

const ENABLE_MOCK_FALLBACK = import.meta.env.VITE_ENABLE_MOCK_FALLBACK === 'true';

export function useOrders(params?: OrderQueryParams) {
  const [orders, setOrders] = useState<Order[]>(() => store.getState().orders);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await ordersApi.getAll(params);
      setOrders(data);
    } catch (err: any) {
      if (ENABLE_MOCK_FALLBACK) {
        console.info('[useOrders] Falling back to local store state.');
        setOrders(store.getState().orders);
      } else {
        setError(err.message || 'Failed to fetch bills from server.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [params?.channel, params?.paymentMethod, params?.search]);

  useEffect(() => {
    fetchOrders();

    // Subscribe to store updates for instant local reflection
    const unsub = store.subscribe((state) => {
      if (ENABLE_MOCK_FALLBACK) {
        setOrders(state.orders);
      }
    });

    return unsub;
  }, [fetchOrders]);

  const createOrder = useCallback(
    async (orderData: Omit<Order, 'id' | 'orderNumber' | 'createdAt' | 'timeline'>): Promise<Order> => {
      try {
        const created = await ordersApi.create(orderData);
        setOrders((prev) => [created, ...prev]);
        store.addToast('Bill Settled', `Invoice ${created.orderNumber} successfully registered on server.`, 'success');
        return created;
      } catch (err: any) {
        if (ENABLE_MOCK_FALLBACK) {
          console.warn('[useOrders] Server checkout unavailable. Committing to local register.', err);
          const fallbackOrder = await store.createOrder(orderData);
          setOrders((prev) => [fallbackOrder, ...prev]);
          return fallbackOrder;
        }
        store.addToast('Billing Error', err.message || 'Could not settle bill.', 'error');
        throw err;
      }
    },
    []
  );

  const updateFulfillment = useCallback(
    async (orderId: string, status: FulfillmentStatus, courier?: string, tracking?: string): Promise<Order | void> => {
      try {
        const updated = await ordersApi.updateFulfillment(orderId, status, courier, tracking);
        setOrders((prev) => prev.map((o) => (o.id === orderId ? updated : o)));
        store.addToast('Fulfillment Updated', `${updated.orderNumber} updated to [${status}].`, 'info');
        return updated;
      } catch (err: any) {
        if (ENABLE_MOCK_FALLBACK) {
          store.updateFulfillmentStatus(orderId, status, courier, tracking);
          setOrders(store.getState().orders);
          return;
        }
        store.addToast('Update Failed', err.message || 'Could not update fulfillment.', 'error');
        throw err;
      }
    },
    []
  );

  return {
    orders,
    isLoading,
    error,
    refetch: fetchOrders,
    createOrder,
    updateFulfillment,
  };
}
