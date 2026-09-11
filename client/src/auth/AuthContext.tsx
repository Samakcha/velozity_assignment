import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, setAccessToken, setAccessTokenGetter } from '../services/api';
import { authService } from './auth.service';
import { disconnectSocket } from '../socket/socket';

interface AuthContextType {
  user: User | null;
  accessToken: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  isAdmin: boolean;
  isPM: boolean;
  isDev: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessTokenState] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Synchronize in-memory token getter for API calls
  useEffect(() => {
    setAccessTokenGetter(() => accessToken);
    setAccessToken(accessToken);
  }, [accessToken]);

  // Silent refresh on app load via HttpOnly refresh cookie
  useEffect(() => {
    let isMounted = true;
    authService
      .refresh()
      .then((data) => {
        if (!isMounted) return;
        setAccessToken(data.accessToken);
        setAccessTokenState(data.accessToken);
        setUser(data.user);
      })
      .catch(() => {
        if (!isMounted) return;
        setAccessToken(null);
        setAccessTokenState(null);
        setUser(null);
      })
      .finally(() => {
        if (!isMounted) return;
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const login = async (email: string, password: string): Promise<User> => {
    const data = await authService.login(email, password);
    setAccessToken(data.accessToken);
    setAccessTokenState(data.accessToken);
    setUser(data.user);
    return data.user;
  };

  const logout = async () => {
    disconnectSocket();
    await authService.logout();
    setAccessToken(null);
    setAccessTokenState(null);
    setUser(null);
  };

  const isAdmin = user?.role === 'ADMIN';
  const isPM = user?.role === 'PROJECT_MANAGER';
  const isDev = user?.role === 'DEVELOPER';

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        loading,
        login,
        logout,
        isAdmin,
        isPM,
        isDev,
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
