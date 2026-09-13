import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, UserRole } from '../types/api';
import { authService } from '../services/auth.service';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  role: UserRole | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, role?: string, departmentId?: number) => Promise<void>;
  logout: () => void;
  switchDemoUser: (role: 'admin' | 'staff' | 'student') => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const storedToken = authService.getToken();
    const storedUser = authService.getStoredUser();
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(storedUser);
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    const res = await authService.login(email, password);
    setUser(res.user);
    setToken(res.token);
  };

  const register = async (name: string, email: string, password: string, role?: string, departmentId?: number) => {
    const res = await authService.register(name, email, password, role, departmentId);
    setUser(res.user);
    setToken(res.token);
  };

  const logout = () => {
    authService.logout();
    setUser(null);
    setToken(null);
  };

  const switchDemoUser = async (demoRole: 'admin' | 'staff' | 'student') => {
    let email = 'student1@uconnect.edu';
    if (demoRole === 'admin') email = 'admin@test.com';
    else if (demoRole === 'staff') email = 'staff1@uconnect.edu';

    await login(email, 'password123');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
        role: user ? user.role : null,
        isLoading,
        login,
        register,
        logout,
        switchDemoUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
