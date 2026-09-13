import { request } from './apiClient';
import { ApiResponse, DashboardStats } from '../types/api';

export const dashboardService = {
  async getStats(): Promise<DashboardStats> {
    const res = await request<ApiResponse<DashboardStats>>('/api/dashboard', {
      method: 'GET',
    });
    return res.data;
  },
};
