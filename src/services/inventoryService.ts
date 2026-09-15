import { store } from './store';
import { InventoryLog } from '../types';
import { productsApi } from '../api/products';

export const inventoryService = {
  getLogs: (): InventoryLog[] => store.getState().inventoryLogs,
  adjustStock: (
    productId: string,
    variantId: string,
    changeQty: number,
    reason: InventoryLog['reason']
  ) => store.adjustStock(productId, variantId, changeQty, reason),

  // Async API methods
  fetchLogsFromApi: async (productId?: string): Promise<InventoryLog[]> => {
    return await productsApi.getInventoryLogs(productId);
  },
  adjustStockOnApi: async (
    productId: string,
    variantId: string,
    changeQty: number,
    reason: InventoryLog['reason'],
    note?: string
  ): Promise<InventoryLog> => {
    return await productsApi.adjustStock(productId, variantId, changeQty, reason, note);
  },
};
