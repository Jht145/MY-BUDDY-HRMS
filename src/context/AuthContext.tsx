'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AuthState, SignInCredentials, SignUpCredentials, User } from '@/types/auth';
import {
  getRedirectPathForRole,
  getStoredToken,
  getStoredUsers,
  initLocalStore,
  loginUser,
  parseJWT,
  registerUser,
  removeStoredToken,
} from '@/lib/auth';

interface AuthContextType extends AuthState {
  signIn: (credentials: SignInCredentials) => Promise<User>;
  signUp: (credentials: SignUpCredentials) => Promise<User>;
  signOut: () => void;
  demoLogin: (role: 'EMPLOYEE' | 'HR_ADMIN') => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const router = useRouter();

  useEffect(() => {
    initLocalStore();
    const storedToken = getStoredToken();
    if (storedToken) {
      const payload = parseJWT(storedToken);
      if (payload) {
        setToken(storedToken);
        const users = getStoredUsers();
        const found = users.find((u) => u.user_id === payload.user_id);
        if (found) {
          const { password, ...safeUser } = found;
          setUser(safeUser);
        } else {
          setUser({
            user_id: payload.user_id,
            company_name: payload.company_name,
            employee_id: payload.employee_id,
            first_name: payload.first_name,
            last_name: payload.last_name,
            email: payload.email,
            role: payload.role,
          });
        }
      } else {
        removeStoredToken();
      }
    }
    setIsLoading(false);
  }, []);

  const signIn = async (credentials: SignInCredentials): Promise<User> => {
    const result = await loginUser(credentials);
    setUser(result.user);
    setToken(result.token);
    const redirectUrl = getRedirectPathForRole(result.user.role);
    router.push(redirectUrl);
    return result.user;
  };

  const signUp = async (credentials: SignUpCredentials): Promise<User> => {
    const result = await registerUser(credentials);
    setUser(result.user);
    setToken(result.token);
    const redirectUrl = getRedirectPathForRole(result.user.role);
    router.push(redirectUrl);
    return result.user;
  };

  const signOut = () => {
    removeStoredToken();
    setUser(null);
    setToken(null);
    router.push('/login');
  };

  const demoLogin = async (role: 'EMPLOYEE' | 'HR_ADMIN') => {
    initLocalStore();
    const users = getStoredUsers();
    const target = users.find((u) => u.role === role) || users[0];
    if (target && target.password) {
      await signIn({
        email: target.email,
        password: target.password,
      });
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        isLoading,
        signIn,
        signUp,
        signOut,
        demoLogin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
