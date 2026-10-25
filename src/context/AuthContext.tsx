import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../types';
import { api } from '../services/api';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  quickUsers: User[];
  login: (identifier: string, password: string) => Promise<void>;
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
      await fetchQuickUsers();
      const token = api.getToken();
      if (token) {
        try {
          const res = await api.getMe();
          if (res?.user) {
            setUser(res.user);
          } else {
            const cached = api.getCurrentCachedUser();
            if (cached) {
              setUser(cached);
            } else {
              api.setToken(null);
              setUser(null);
            }
          }
        } catch {
          const cached = api.getCurrentCachedUser();
          if (cached) {
            setUser(cached);
          } else {
            api.setToken(null);
            setUser(null);
          }
        }
      } else {
        // No saved session: let the user log in
        setUser(null);
      }
    } catch (e) {
      console.error('Init auth error:', e);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    initAuth();
  }, []);

  const login = async (identifier: string, password: string) => {
    const res = await api.login(identifier, password);
    setUser(res.user);
    await fetchQuickUsers();
  };

  const logout = () => {
    api.setToken(null);
    setUser(null);
  };

  const switchUser = (targetUser: User) => {
    api.setToken(targetUser.id);
    try {
      localStorage.setItem('hm_gran_fiesta_user', JSON.stringify(targetUser));
    } catch {}
    setUser(targetUser);
  };

  const refreshUser = async () => {
    try {
      const res = await api.getMe();
      if (res?.user) {
        setUser(res.user);
        try {
          localStorage.setItem('hm_gran_fiesta_user', JSON.stringify(res.user));
        } catch {}
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
