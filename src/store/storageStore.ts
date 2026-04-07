import { create } from 'zustand';
import { storageApi, type StorageUsage } from '../api/storage';

interface StorageStore {
  storageUsage: StorageUsage | null;
  isLoading: boolean;
  error: string | null;
  fetchStorageUsage: () => Promise<void>;
}

export const useStorageStore = create<StorageStore>((set) => ({
  storageUsage: null,
  isLoading: false,
  error: null,

  fetchStorageUsage: async () => {
    set({ isLoading: true, error: null });
    try {
      const usage = await storageApi.getStorageUsage();
      set({ storageUsage: usage, isLoading: false });
    } catch {
      set({ error: 'Failed to load storage usage', isLoading: false });
    }
  },
}));

export default useStorageStore;
