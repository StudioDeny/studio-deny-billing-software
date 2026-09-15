import { store } from './store';
import { InventoryLog } from '../types';

export const inventoryService = {
  getLogs: (): InventoryLog[] => store.getState().inventoryLogs,
  adjustStock: (
    productId: string,
    variantId: string,
    changeQty: number,
    reason: InventoryLog['reason']
  ) => store.adjustStock(productId, variantId, changeQty, reason),
};
