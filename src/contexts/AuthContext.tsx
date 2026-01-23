/**
 * Authentication context provider
 */
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  authApi,
  getAuthToken,
  setAuthToken,
  removeAuthToken,
  ApiError,
  type UserProfile,
} from '../utils/api';

interface AuthContextType {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<UserProfile>;
  register: (email: string, username: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isAuthenticated = user !== null;

  // Check for existing token on mount
  useEffect(() => {
    const token = getAuthToken();
    if (token) {
      // Validate token by fetching user info
      authApi
        .me()
        .then((userData) => {
          setUser(userData);
        })
        .catch(() => {
          // Token invalid, remove it
          removeAuthToken();
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<UserProfile> => {
    setError(null);
    setIsLoading(true);

    try {
      const response = await authApi.login(email, password);
      setAuthToken(response.access_token);

      // Fetch full user profile with stats
      const profile = await authApi.me();
      setUser(profile);
      return profile;
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.detail || 'Login failed');
      } else {
        setError('An unexpected error occurred');
      }
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const register = useCallback(async (email: string, username: string, password: string) => {
    setError(null);
    setIsLoading(true);

    try {
      await authApi.register(email, username, password);
      // Auto-login after registration
      await login(email, password);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.detail || 'Registration failed');
      } else {
        setError('An unexpected error occurred');
      }
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [login]);

  const logout = useCallback(() => {
    removeAuthToken();
    setUser(null);
    setError(null);
  }, []);

  const refreshUser = useCallback(async () => {
    if (!getAuthToken()) return;

    try {
      const profile = await authApi.me();
      setUser(profile);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        logout();
      }
    }
  }, [logout]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoading,
        error,
        login,
        register,
        logout,
        refreshUser,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
