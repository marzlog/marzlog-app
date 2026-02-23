import apiClient from './client';

export interface Announcement {
  id: string;
  title: string;
  body: string | null;
  type: string;
  is_active: boolean;
  is_read: boolean;
  created_at: string;
  expires_at: string | null;
}

export interface AnnouncementListResponse {
  announcements: Announcement[];
  total: number;
  unread_count: number;
}

export interface UnreadCountResponse {
  count: number;
}

export const announcementsApi = {
  async getAnnouncements(limit = 20, offset = 0): Promise<AnnouncementListResponse> {
    const response = await apiClient.get<AnnouncementListResponse>('/announcements', {
      params: { limit, offset },
    });
    return response.data;
  },

  async getUnreadCount(): Promise<UnreadCountResponse> {
    const response = await apiClient.get<UnreadCountResponse>('/announcements/unread-count');
    return response.data;
  },

  async markAsRead(id: string): Promise<void> {
    await apiClient.patch(`/announcements/${id}/read`);
  },
};

export default announcementsApi;
