import { store } from './store';
import { ReturnRequest, ReturnStatus } from '../types';

export const returnsService = {
  getAll: (): ReturnRequest[] => store.getState().returns,
  getById: (id: string): ReturnRequest | undefined =>
    store.getState().returns.find((r) => r.id === id || r.returnNumber === id),
  updateStatus: (id: string, status: ReturnStatus) => store.updateReturnStatus(id, status),
  create: (data: Omit<ReturnRequest, 'id' | 'returnNumber' | 'createdAt' | 'status'>) =>
    store.createReturnRequest(data),
};
