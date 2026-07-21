'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

interface User {
  id: string;
  telegram_id: number;
  username?: string;
  first_name?: string;
  last_name?: string;
  coins_balance: number;
  usdt_balance: number;
  energy: number;
  max_energy: number;
  referral_code?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: () => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const checkAuth = useCallback(async () => {
    try {
      console.log('[AUTH] === AUTHENTICATION REQUEST ===');
      
      if (typeof window === 'undefined' || !window.Telegram?.WebApp) {
        console.error('[AUTH] Telegram WebApp not available for auth');
        setIsLoading(false);
        setIsAuthenticated(false);
        return;
      }

      const tg = window.Telegram.WebApp;
      const initData = tg.initData;
      
      console.log('[AUTH] initData to send:', initData ? 'YES' : 'NO');
      console.log('[AUTH] initData length:', initData?.length || 0);
      console.log('[AUTH] initData preview:', initData?.substring(0, 100) + '...' || 'empty');
      
      if (!initData) {
        console.error('[AUTH] No initData available, cannot authenticate');
        setIsLoading(false);
        setIsAuthenticated(false);
        return;
      }

      console.log('[AUTH] Sending request to /api/auth/telegram...');
      const response = await fetch('/api/auth/telegram', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ initData }),
      });

      console.log('[AUTH] Response status:', response.status);
      console.log('[AUTH] Response ok:', response.ok);

      if (response.ok) {
        const data = await response.json();
        console.log('[AUTH] Authentication successful:', data);
        setUser(data.user);
        setIsAuthenticated(true);
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('[AUTH] Authentication failed:', errorData);
        setUser(null);
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error('[AUTH] Auth check failed:', error);
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Wait for Telegram WebApp to be ready before checking auth
    const initTelegramAndCheckAuth = () => {
      console.log('[AUTH] === TELEGRAM WEBAPP DEBUG ===');
      console.log('[AUTH] window.Telegram exists:', typeof window !== 'undefined' && !!window.Telegram);
      console.log('[AUTH] window.Telegram.WebApp exists:', typeof window !== 'undefined' && !!window.Telegram?.WebApp);
      
      if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
        const tg = window.Telegram.WebApp;
        console.log('[AUTH] Telegram WebApp version:', tg.version);
        console.log('[AUTH] Telegram WebApp platform:', tg.platform);
        console.log('[AUTH] Telegram WebApp initData length:', tg.initData?.length || 0);
        console.log('[AUTH] Telegram WebApp initData preview:', tg.initData?.substring(0, 100) + '...' || 'empty');
        console.log('[AUTH] Telegram WebApp initDataUnsafe:', JSON.stringify(tg.initDataUnsafe, null, 2));
        
        // Call ready() to signal to Telegram that the app is ready
        tg.ready();
        tg.expand();
        
        console.log('[AUTH] Telegram WebApp ready() called');
        
        // Now check auth with the initData
        checkAuth();
      } else {
        console.error('[AUTH] Telegram WebApp not available');
        console.log('[AUTH] Running outside Telegram or SDK not loaded');
        setIsLoading(false);
        setIsAuthenticated(false);
      }
    };

    // Small delay to ensure Telegram SDK is loaded
    const timer = setTimeout(initTelegramAndCheckAuth, 100);
    return () => clearTimeout(timer);
  }, [checkAuth]);

  const login = async () => {
    setIsLoading(true);
    await checkAuth();
  };

  const logout = () => {
    setUser(null);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, isLoading, login, logout }}>
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
