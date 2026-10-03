import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { User, UserRole } from '../types/api';
import { authService } from '../services/auth.service';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  role: UserRole | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (name: string, username: string, email: string, password: string, role?: UserRole, departmentId?: number) => Promise<void>;
  logout: () => void;
  switchDemoUser: (role: 'admin' | 'staff' | 'student') => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const INACTIVITY_TIMEOUT = 30 * 60 * 1000;

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const logout = useCallback(() => {
    void authService.logout();
    setUser(null);
    setToken(null);
  }, []);

  useEffect(() => {
    const storedToken = authService.getToken();
    const storedUser = authService.getStoredUser();
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(storedUser);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (!token || !user) return;

    let timer: number | undefined;
    const resetTimer = () => {
      if (timer) window.clearTimeout(timer);
      timer = window.setTimeout(logout, INACTIVITY_TIMEOUT);
    };

    const events = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart'];
    events.forEach((event) => window.addEventListener(event, resetTimer));
    resetTimer();

    return () => {
      if (timer) window.clearTimeout(timer);
      events.forEach((event) => window.removeEventListener(event, resetTimer));
    };
  }, [token, user, logout]);

  const login = async (username: string, password: string) => {
    const res = await authService.login(username, password);
    setUser(res.user);
    setToken(res.token);
  };

  const register = async (name: string, username: string, email: string, password: string, role: UserRole = 'student', departmentId?: number) => {
    const res = await authService.register(name, username, email, password, role, departmentId);
    setUser(res.user);
    setToken(res.token);
  };

  const switchDemoUser = async (demoRole: 'admin' | 'staff' | 'student') => {
    const username = demoRole === 'admin' ? 'admin' : demoRole === 'staff' ? 'staff1' : 'student1';
    await login(username, 'password123');
  };

  return (
    <AuthContext.Provider value={{
      user,
      token,
      isAuthenticated: !!token && !!user,
      role: user ? user.role : null,
      isLoading,
      login,
      register,
      logout,
      switchDemoUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
