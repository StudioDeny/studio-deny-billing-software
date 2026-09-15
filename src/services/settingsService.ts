import { store } from './store';
import { CommerceSettings } from '../types';

export const settingsService = {
  get: (): CommerceSettings => store.getState().settings,
  update: (updates: Partial<CommerceSettings>) => store.updateSettings(updates),
  testPrint: () => store.testPrint(),
};
