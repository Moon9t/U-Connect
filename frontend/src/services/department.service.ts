import { request } from './apiClient';
import { ApiResponse, Department } from '../types/api';

export const departmentService = {
  async getDepartments(): Promise<Department[]> {
    const res = await request<ApiResponse<Department[]>>('/api/departments', {
      method: 'GET',
    });
    return res.data || [];
  },

  async createDepartment(data: { name: string; code: string; description?: string }): Promise<Department> {
    const res = await request<ApiResponse<Department>>('/api/admin/departments', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res.data;
  },

  async updateDepartment(id: number, data: { name?: string; code?: string; description?: string }): Promise<Department> {
    const res = await request<ApiResponse<Department>>(`/api/admin/departments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return res.data;
  },

  async deleteDepartment(id: number): Promise<void> {
    await request<ApiResponse<{ message: string }>>(`/api/admin/departments/${id}`, {
      method: 'DELETE',
    });
  },
};
