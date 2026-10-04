import { request } from './apiClient';
import { ApiResponse, User, UserRole, CreateUserDTO } from '../types/api';

export const adminService = {
  async getUsers(): Promise<User[]> {
    const res = await request<ApiResponse<User[]>>('/api/admin/users', {
      method: 'GET',
    });
    return res.data || [];
  },

  async createUser(data: CreateUserDTO): Promise<User> {
    const res = await request<ApiResponse<User>>('/api/admin/users', {
      method: 'POST',
      body: JSON.stringify(data),
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
    await request<ApiResponse<{ message: string }>>(`/api/admin/users/${userId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ is_active: isActive }),
    });
  },

  async deleteUser(userId: number): Promise<void> {
    await request<ApiResponse<{ message: string }>>(`/api/admin/users/${userId}`, {
      method: 'DELETE',
    });
  },
};
