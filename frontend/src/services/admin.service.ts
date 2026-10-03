import { request } from './apiClient';
import { ApiResponse, CreateUserPayload, User, UserRole } from '../types/api';

export const adminService = {
  async getUsers(): Promise<User[]> {
    const res = await request<ApiResponse<User[]>>('/api/admin/users', { method: 'GET' });
    return res.data || [];
  },

  async createUser(payload: CreateUserPayload): Promise<User> {
    const res = await request<ApiResponse<User>>('/api/admin/users', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res.data;
  },

  async updateUser(userId: number, payload: { name?: string; email?: string; department_id?: number }): Promise<User> {
    const res = await request<ApiResponse<User>>(`/api/admin/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    return res.data;
  },

  async updateUserRole(userId: number, role: UserRole): Promise<void> {
    await request<ApiResponse<{ message: string }>>(`/api/admin/users/${userId}/role`, {
      method: 'PUT',
      body: JSON.stringify({ role }),
    });
  },

  async deactivateUser(userId: number): Promise<void> {
    await request<ApiResponse<{ message: string }>>(`/api/admin/users/${userId}/deactivate`, { method: 'PUT' });
  },
};
