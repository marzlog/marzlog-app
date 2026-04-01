import apiClient from './client';

export interface StorageInfo {
  plan: string;
  plan_name: string;
  used_bytes: number;
  limit_bytes: number;
  used_formatted: string;
  limit_formatted: string;
  used_gb: number;
  limit_gb: number;
  usage_percent: number;
  price_krw: number;
  plan_started_at: string | null;
  plan_expires_at: string | null;
}

export interface StorageUsage {
  used_bytes: number;
  limit_bytes: number;
  used_percentage: number;
  plan: 'free' | 'basic' | 'pro' | 'unlimited';
}

export interface PlanInfo {
  plan: string;
  name: string;
  limit_bytes: number;
  limit_gb: number;
  limit_formatted: string;
  price_krw: number;
  price_usd_cents: number;
}

export const storageApi = {
  async getStorageInfo(): Promise<StorageInfo> {
    const response = await apiClient.get<StorageInfo>('/auth/me/storage');
    return response.data;
  },

  async getStorageUsage(): Promise<StorageUsage> {
    const response = await apiClient.get<StorageUsage>('/users/storage');
    return response.data;
  },

  async getPlans(): Promise<PlanInfo[]> {
    const response = await apiClient.get<{ plans: PlanInfo[] }>('/auth/plans');
    return response.data.plans;
  },
};

export default storageApi;
