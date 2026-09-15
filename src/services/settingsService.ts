import { store } from './store';
import { CommerceSettings } from '../types';
import { settingsApi } from '../api/settings';

export const settingsService = {
  get: (): CommerceSettings => store.getState().settings,
  update: (updates: Partial<CommerceSettings>) => store.updateSettings(updates),
  testPrint: () => store.testPrint(),

  // Async API methods
  fetchFromApi: async (): Promise<CommerceSettings> => {
    return await settingsApi.getSettings();
  },
  updateOnApi: async (updates: Partial<CommerceSettings>): Promise<CommerceSettings> => {
    return await settingsApi.updateSettings(updates);
  },
  testPrintOnApi: async () => {
    return await settingsApi.testPrint();
  },
};
