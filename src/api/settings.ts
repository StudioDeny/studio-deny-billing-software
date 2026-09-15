import { apiClient } from './client';
import { CommerceSettings, StaffMember } from '../types';

export const settingsApi = {
  getSettings: async (): Promise<CommerceSettings> => {
    const res = await apiClient<CommerceSettings>('/settings/commerce');
    return res.data;
  },

  updateSettings: async (updates: Partial<CommerceSettings>): Promise<CommerceSettings> => {
    const res = await apiClient<CommerceSettings>('/settings/commerce', {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
    return res.data;
  },

  getStaff: async (): Promise<StaffMember[]> => {
    const res = await apiClient<StaffMember[]>('/staff');
    return res.data;
  },

  createStaff: async (data: Omit<StaffMember, 'id'>): Promise<StaffMember> => {
    const res = await apiClient<StaffMember>('/staff', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res.data;
  },

  testPrint: async (): Promise<{ success: boolean; message: string; timestamp: string }> => {
    const res = await apiClient<{ success: boolean; message: string; timestamp: string }>(
      '/settings/printer/test',
      { method: 'POST' }
    );
    return res.data;
  },
};
