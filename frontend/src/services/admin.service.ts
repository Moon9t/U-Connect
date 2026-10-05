import { request } from './apiClient';
import { ApiResponse, CreateUserDTO, CreateUserPayload, User, UserRole } from '../types/api';

export const adminService = {
  async getUsers(): Promise<User[]> {
    const res = await request<ApiResponse<User[]>>('/api/admin/users', { method: 'GET' });
    return res.data || [];
  },

  async createUser(data: CreateUserDTO | CreateUserPayload): Promise<User> {
    const res = await request<ApiResponse<User>>('/api/admin/users', {
      method: 'POST',
      body: JSON.stringify(data),
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

  async toggleUserStatus(userId: number, isActive: boolean): Promise<void> {
    try {
      await request<ApiResponse<{ message: string }>>(`/api/admin/users/${userId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ is_active: isActive }),
      });
    } catch {
      // Fallback for deactivate
      if (!isActive) {
        await request<ApiResponse<{ message: string }>>(`/api/admin/users/${userId}/deactivate`, { method: 'PUT' });
      }
    }
  },

  async deactivateUser(userId: number): Promise<void> {
    await request<ApiResponse<{ message: string }>>(`/api/admin/users/${userId}/deactivate`, { method: 'PUT' });
  },

  async deleteUser(userId: number): Promise<void> {
    await request<ApiResponse<{ message: string }>>(`/api/admin/users/${userId}`, {
      method: 'DELETE',
    });
  },
};
