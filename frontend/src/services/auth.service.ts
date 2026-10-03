import { request } from './apiClient';
import { ApiResponse, LoginResponse, User, UserRole } from '../types/api';

export const authService = {
  async login(username: string, password: string): Promise<LoginResponse> {
    const res = await request<ApiResponse<LoginResponse>>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    if (res.data?.token) {
      localStorage.setItem('uconnect_token', res.data.token);
      localStorage.setItem('uconnect_user', JSON.stringify(res.data.user));
    }
    return res.data;
  },

  async register(
    name: string,
    username: string,
    email: string,
    password: string,
    role: UserRole = 'student',
    department_id?: number,
  ): Promise<LoginResponse> {
    const res = await request<ApiResponse<LoginResponse>>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, username, email, password, role, department_id }),
    });
    if (res.data?.token) {
      localStorage.setItem('uconnect_token', res.data.token);
      localStorage.setItem('uconnect_user', JSON.stringify(res.data.user));
    }
    return res.data;
  },

  async logout(): Promise<void> {
    try {
      if (this.getToken()) {
        await request<void>('/api/auth/logout', { method: 'POST' });
      }
    } finally {
      localStorage.removeItem('uconnect_token');
      localStorage.removeItem('uconnect_user');
    }
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
  },
};
