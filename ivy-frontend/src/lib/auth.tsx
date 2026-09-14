'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { clearTokens, login as apiLogin, refresh } from './api';

const USER_KEY = 'ivy.auth.user';

type AuthContextValue = {
  email: string | null;
  ready: boolean;
  loggedIn: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [email, setEmail] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setEmail(window.localStorage.getItem(USER_KEY));
    setReady(true);

    const refreshTimer = window.setInterval(() => {
      if (window.localStorage.getItem(USER_KEY)) {
        refresh().catch(() => {
          window.localStorage.removeItem(USER_KEY);
          setEmail(null);
        });
      }
    }, 10 * 60 * 1000);

    return () => window.clearInterval(refreshTimer);
  }, []);

  async function login(emailAddress: string, password: string) {
    await apiLogin(emailAddress, password);
    window.localStorage.setItem(USER_KEY, emailAddress);
    setEmail(emailAddress);
  }

  function logout() {
    clearTokens();
    window.localStorage.removeItem(USER_KEY);
    setEmail(null);
  }

  return <AuthContext.Provider value={{ email, ready, loggedIn: Boolean(email), login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
