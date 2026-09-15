import { useState, useEffect, useCallback } from 'react';
import { Customer } from '../types';
import { customersApi } from '../api/customers';
import { store } from '../services/store';
import { CustomerQueryParams } from '../types/api';

const ENABLE_MOCK_FALLBACK = import.meta.env.VITE_ENABLE_MOCK_FALLBACK === 'true';

export function useCustomers(params?: CustomerQueryParams) {
  const [customers, setCustomers] = useState<Customer[]>(() => store.getState().customers);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCustomers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await customersApi.getAll(params);
      setCustomers(data);
    } catch (err: any) {
      if (ENABLE_MOCK_FALLBACK) {
        console.info('[useCustomers] Falling back to local CRM store.');
        setCustomers(store.getState().customers);
      } else {
        setError(err.message || 'Failed to load customers from server.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [params?.segment, params?.search]);

  useEffect(() => {
    fetchCustomers();

    const unsub = store.subscribe((state) => {
      if (ENABLE_MOCK_FALLBACK) {
        setCustomers(state.customers);
      }
    });

    return unsub;
  }, [fetchCustomers]);

  const createCustomer = useCallback(
    async (
      data: Omit<Customer, 'id' | 'ordersCount' | 'totalSpend' | 'averageOrderValue' | 'createdAt'>
    ): Promise<Customer> => {
      try {
        const created = await customersApi.create(data);
        setCustomers((prev) => [created, ...prev]);
        store.addToast('Customer Created', `${created.name} added to CRM database.`, 'success');
        return created;
      } catch (err: any) {
        if (ENABLE_MOCK_FALLBACK) {
          const fallback = store.addCustomer(data);
          setCustomers((prev) => [fallback, ...prev]);
          return fallback;
        }
        store.addToast('CRM Error', err.message || 'Could not register customer.', 'error');
        throw err;
      }
    },
    []
  );

  return {
    customers,
    isLoading,
    error,
    refetch: fetchCustomers,
    createCustomer,
  };
}
