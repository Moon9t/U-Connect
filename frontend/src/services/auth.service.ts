import { request } from './apiClient';
import { ApiResponse, LoginResponse, User } from '../types/api';

export const authService = {
  async login(email: string, password: string): Promise<LoginResponse> {
    const res = await request<ApiResponse<LoginResponse>>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (res.data?.token) {
      localStorage.setItem('uconnect_token', res.data.token);
      localStorage.setItem('uconnect_user', JSON.stringify(res.data.user));
    }
    return res.data;
  },

  async register(name: string, email: string, password: string, role: string = 'student', department_id?: number): Promise<LoginResponse> {
    const res = await request<ApiResponse<LoginResponse>>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password, role, department_id }),
    });
    if (res.data?.token) {
      localStorage.setItem('uconnect_token', res.data.token);
      localStorage.setItem('uconnect_user', JSON.stringify(res.data.user));
    }
    return res.data;
  },

  logout() {
    localStorage.removeItem('uconnect_token');
    localStorage.removeItem('uconnect_user');
  },

  getStoredUser(): User | null {
    const saved = localStorage.getItem('uconnect_user');
    if (!saved) return null;
    try {
      return JSON.parse(saved);
    } catch {
      return null;
    }
  },

  getToken(): string | null {
    return localStorage.getItem('uconnect_token');
  }
};
