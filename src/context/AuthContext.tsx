import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../types';
import { api } from '../services/api';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  quickUsers: User[];
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  switchUser: (targetUser: User) => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [quickUsers, setQuickUsers] = useState<User[]>([]);

  const fetchQuickUsers = async () => {
    try {
      const users = await api.getQuickUsers();
      setQuickUsers(users);
      return users;
    } catch (e) {
      console.error('Error fetching quick users:', e);
      return [];
    }
  };

  const initAuth = async () => {
    setLoading(true);
    try {
      const users = await fetchQuickUsers();
      const token = api.getToken();
      if (token) {
        try {
          const res = await api.getMe();
          if (res.user) {
            setUser(res.user);
          } else {
            // Default to admin if token exists but user returned empty
            const admin = users.find(u => u.email === 'xiscoquin@gmail.com' || u.role === 'admin') || users[0];
            if (admin) {
              setUser(admin);
              api.setToken(admin.id);
            }
          }
        } catch {
          // If token invalid, default to admin
          const admin = users.find(u => u.email === 'xiscoquin@gmail.com' || u.role === 'admin') || users[0];
          if (admin) {
            setUser(admin);
            api.setToken(admin.id);
          }
        }
      } else {
        // If no token, set admin as default for seamless local dev / evaluation
        const admin = users.find(u => u.email === 'xiscoquin@gmail.com' || u.role === 'admin') || users[0];
        if (admin) {
          setUser(admin);
          api.setToken(admin.id);
        }
      }
    } catch (e) {
      console.error('Init auth error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    const res = await api.login(email, password);
    setUser(res.user);
    await fetchQuickUsers();
  };

  const logout = () => {
    api.setToken(null);
    setUser(null);
  };

  const switchUser = (targetUser: User) => {
    api.setToken(targetUser.id);
    setUser(targetUser);
  };

  const refreshUser = async () => {
    try {
      const res = await api.getMe();
      if (res.user) {
        setUser(res.user);
      }
    } catch (e) {
      console.error('Refresh user error:', e);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        quickUsers,
        login,
        logout,
        switchUser,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
