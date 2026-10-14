import apiClient from './client';

export interface StorageUsage {
  used_bytes: number;
  limit_bytes: number;
  used_percentage: number;
  // 서버는 plan 도 내려주지만(레거시 표시 경로, 만료와 무관) 앱은 읽지 않는다 — Plus 판정은 /auth/me plan(PW-1)
}

export const storageApi = {
  async getStorageUsage(): Promise<StorageUsage> {
    const response = await apiClient.get<StorageUsage>('/users/storage');
    return response.data;
  },
};

export default storageApi;
