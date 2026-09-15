import { store } from './store';
import { PaymentTransaction } from '../types';

export const paymentsService = {
  getAll: (): PaymentTransaction[] => store.getState().payments,
  getByOrder: (orderNumber: string): PaymentTransaction | undefined =>
    store.getState().payments.find((p) => p.orderNumber === orderNumber),
};
