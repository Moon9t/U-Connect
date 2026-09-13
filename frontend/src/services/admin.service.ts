import { request } from './apiClient';
import { ApiResponse, User, UserRole } from '../types/api';

export const adminService = {
  async getUsers(): Promise<User[]> {
    const res = await request<ApiResponse<User[]>>('/api/admin/users', {
      method: 'GET',
    });
    return res.data || [];
  },

  async updateUserRole(userId: number, role: UserRole): Promise<void> {
    await request<ApiResponse<{ message: string }>>(`/api/admin/users/${userId}/role`, {
      method: 'PUT',
      body: JSON.stringify({ role }),
    });
  },
};
