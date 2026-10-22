import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { api } from '../services/api';

interface AuthContextType {
  user: User | null;
  quickUsers: User[];
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  switchUser: (targetUser: User) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [quickUsers, setQuickUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchQuickUsers = async () => {
    try {
      const list = await api.getQuickUsers();
      setQuickUsers(list);
    } catch (e) {
      console.error('Failed to load quick users', e);
    }
  };

  const initAuth = async () => {
    setLoading(true);
    await fetchQuickUsers();
    const token = localStorage.getItem('tf_token');
    if (token) {
      try {
        const { user: me } = await api.getMe();
        setUser(me);
      } catch (err) {
        console.warn('Session expired or invalid', err);
        localStorage.removeItem('tf_token');
        setUser(null);
      }
    } else {
      // Default initial login as admin for instant preview convenience
      try {
        const list = await api.getQuickUsers();
        const adminUser = list.find(u => u.role === 'admin') || list[0];
        if (adminUser) {
          localStorage.setItem('tf_token', adminUser.id);
          const { user: me } = await api.getMe();
          setUser(me);
        }
      } catch (e) {
        console.error(e);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    const res = await api.login(email, password);
    localStorage.setItem('tf_token', res.token);
    setUser(res.user);
    await fetchQuickUsers();
  };

  const switchUser = async (targetUser: User) => {
    localStorage.setItem('tf_token', targetUser.id);
    setUser(targetUser);
    try {
      const { user: me } = await api.getMe();
      setUser(me);
    } catch (e) {
      console.error(e);
    }
  };

  const logout = () => {
    localStorage.removeItem('tf_token');
    setUser(null);
  };

  const refreshUser = async () => {
    try {
      const { user: me } = await api.getMe();
      setUser(me);
      await fetchQuickUsers();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        quickUsers,
        loading,
        login,
        switchUser,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
