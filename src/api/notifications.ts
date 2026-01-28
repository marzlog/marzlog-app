import apiClient from './client';

export interface Notification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  is_read: boolean;
  created_at: string;
}

export interface NotificationListResponse {
  notifications: Notification[];
  total: number;
}

export interface UnreadCountResponse {
  count: number;
}

export const notificationsApi = {
  async getNotifications(limit = 50, offset = 0): Promise<NotificationListResponse> {
    const response = await apiClient.get<NotificationListResponse>('/notifications', {
      params: { limit, offset },
    });
    return response.data;
  },

  async getUnreadCount(): Promise<UnreadCountResponse> {
    const response = await apiClient.get<UnreadCountResponse>('/notifications/unread-count');
    return response.data;
  },

  async markAsRead(id: string): Promise<void> {
    await apiClient.patch(`/notifications/${id}/read`);
  },

  async deleteNotification(id: string): Promise<void> {
    await apiClient.delete(`/notifications/${id}`);
  },

  async deleteNotifications(ids: string[]): Promise<void> {
    await apiClient.delete('/notifications', { data: { ids } });
  },
};

export default notificationsApi;
