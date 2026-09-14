import { request } from './apiClient';
import { ApiResponse, Notification } from '../types/api';

export const notificationService = {
  async getNotifications(): Promise<Notification[]> {
    const response = await request<ApiResponse<Notification[]>>('/api/notifications', {
      method: 'GET',
    });
    return response.data;
  },

  async markAsRead(id: number): Promise<void> {
    await request<ApiResponse<{ read: boolean }>>(`/api/notifications/${id}/read`, {
      method: 'PUT',
    });
  },

  async markAllAsRead(): Promise<void> {
    await request<ApiResponse<{ read: boolean }>>('/api/notifications/read-all', {
      method: 'PUT',
    });
  },
};