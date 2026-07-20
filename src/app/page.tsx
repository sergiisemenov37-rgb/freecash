'use client';

import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export default function Home() {
  const { user, isAuthenticated, isLoading, login } = useAuth();

  useEffect(() => {
    // Initialize Telegram WebApp
    if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp;
      tg.ready();
      tg.expand();
    }
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-500 to-purple-600">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 p-4">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl">
          <h1 className="text-3xl font-bold text-gray-800 mb-4 text-center">
            Welcome to FreeCash
          </h1>
          <p className="text-gray-600 mb-6 text-center">
            Please authenticate with Telegram to continue
          </p>
          <button
            onClick={login}
            className="w-full bg-blue-500 text-white py-3 rounded-xl font-semibold hover:bg-blue-600 transition-colors"
          >
            Login with Telegram
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600">
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl p-6 shadow-2xl">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">
                Welcome, {user?.first_name || 'User'}!
              </h1>
              <p className="text-gray-600">@{user?.username || 'unknown'}</p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-blue-600">
                {user?.coins_balance || 0}
              </div>
              <div className="text-sm text-gray-500">Coins</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-blue-50 rounded-xl p-4">
              <div className="text-2xl font-bold text-blue-600">
                {user?.usdt_balance || 0}
              </div>
              <div className="text-sm text-gray-600">USDT Balance</div>
            </div>
            <div className="bg-purple-50 rounded-xl p-4">
              <div className="text-2xl font-bold text-purple-600">
                {user?.energy || 0}/{user?.max_energy || 1000}
              </div>
              <div className="text-sm text-gray-600">Energy</div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-xl p-4">
            <h3 className="font-semibold text-gray-800 mb-2">Referral Code</h3>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-white px-3 py-2 rounded-lg text-sm">
                {user?.referral_code || 'N/A'}
              </code>
              <button className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors">
                Copy
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
