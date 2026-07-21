'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import TapGame from '@/components/TapGame';
import BoostsShop from '@/components/BoostsShop';
import DailyRewards from '@/components/DailyRewards';
import Missions from '@/components/Missions';
import Referrals from '@/components/Referrals';
import Wallet from '@/components/Wallet';
import Withdrawals from '@/components/Withdrawals';
import AdminWithdrawals from '@/components/AdminWithdrawals';

type Tab = 'game' | 'boosts' | 'rewards' | 'missions' | 'referrals' | 'wallet' | 'withdrawals' | 'admin';

export default function Home() {
  const { user, isAuthenticated, isLoading, login } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('game');
  const [gameState, setGameState] = useState<{
    user: {
      id: string;
      telegram_id: number;
      username?: string;
      first_name?: string;
      last_name?: string;
      coins_balance: number;
      usdt_balance: number;
      energy: number;
      max_energy: number;
      coins_per_tap: number;
      energy_regen_rate: number;
      total_taps: number;
      referral_code?: string;
    };
    boosts: Array<{
      id: string;
      boost_type: string;
      level: number;
      max_level: number;
      is_active: boolean;
    }>;
    dailyRewards: {
      streak: number;
      last_claim: string | null;
      total_claims: number;
      claim_history: string[];
    } | null;
    missions: Array<{
      id: string;
      progress: number;
      is_completed: boolean;
      is_claimed: boolean;
      missions: {
        id: string;
        mission_type: string;
        title: string;
        description: string;
        requirement_type: string;
        requirement_target: number;
        reward_coins: number;
        reward_usdt: number;
      };
    }>;
    autoTap: {
      id: string;
      user_id: string;
      taps_per_minute: number;
      last_run: string;
      is_active: boolean;
    } | null;
  } | null>(null);

  useEffect(() => {
    console.log('[PAGE] === PAGE COMPONENT MOUNTED ===');
    console.log('[PAGE] window.Telegram exists:', typeof window !== 'undefined' && !!window.Telegram);
    console.log('[PAGE] window.Telegram.WebApp exists:', typeof window !== 'undefined' && !!window.Telegram?.WebApp);
    
    if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp;
      console.log('[PAGE] Telegram WebApp already initialized by AuthProvider');
      console.log('[PAGE] Telegram WebApp version:', tg.version);
      console.log('[PAGE] Telegram WebApp platform:', tg.platform);
      console.log('[PAGE] Telegram WebApp initData length:', tg.initData?.length || 0);
    }
  }, []);

  const refreshGameState = useCallback(async () => {
    if (!user?.id) return;
    try {
      const response = await fetch(`/api/game/state?userId=${user.id}`);
      const data = await response.json();
      if (data.success) {
        setGameState(data);
      }
    } catch (error) {
      console.error('Failed to refresh game state:', error);
    }
  }, [user]);

  useEffect(() => {
    let mounted = true;
    const loadState = async () => {
      if (mounted && user?.id) {
        await refreshGameState();
      }
    };
    loadState();
    return () => {
      mounted = false;
    };
  }, [user, refreshGameState]);

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

  const currentUser = gameState?.user || user;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600">
      {/* Header */}
      <div className="bg-white/10 backdrop-blur-sm border-b border-white/20 p-4">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">
              {currentUser?.first_name || 'User'}
            </h1>
            <p className="text-sm text-white/80">@{currentUser?.username || 'unknown'}</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-yellow-300">
              {currentUser?.coins_balance?.toLocaleString() || 0}
            </div>
            <div className="text-xs text-white/80">Coins</div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white/10 backdrop-blur-sm border-b border-white/20">
        <div className="max-w-md mx-auto flex overflow-x-auto">
          {[
            { id: 'game' as Tab, label: 'Game', icon: '🎮' },
            { id: 'boosts' as Tab, label: 'Boosts', icon: '⚡' },
            { id: 'rewards' as Tab, label: 'Rewards', icon: '🎁' },
            { id: 'missions' as Tab, label: 'Missions', icon: '🎯' },
            { id: 'referrals' as Tab, label: 'Referrals', icon: '👥' },
            { id: 'wallet' as Tab, label: 'Wallet', icon: '💰' },
            { id: 'withdrawals' as Tab, label: 'Withdraw', icon: '💸' },
            { id: 'admin' as Tab, label: 'Admin', icon: '⚙️' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-shrink-0 px-4 py-3 text-center font-semibold transition-colors ${
                activeTab === tab.id
                  ? 'bg-white/20 text-white'
                  : 'text-white/70 hover:bg-white/10'
              }`}
            >
              <span className="text-xl mr-1">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-md mx-auto p-4">
        {activeTab === 'game' && user?.id && (
          <TapGame userId={user.id} />
        )}
        
        {activeTab === 'boosts' && user?.id && (
          <BoostsShop 
            userId={user.id} 
            userCoins={currentUser?.coins_balance || 0}
            onPurchase={refreshGameState}
          />
        )}
        
        {activeTab === 'rewards' && user?.id && (
          <DailyRewards 
            userId={user.id}
            onClaim={refreshGameState}
          />
        )}
        
        {activeTab === 'missions' && user?.id && (
          <Missions 
            userId={user.id}
            onClaim={refreshGameState}
          />
        )}
        
        {activeTab === 'referrals' && user?.id && (
          <Referrals userId={user.id} />
        )}
        
        {activeTab === 'wallet' && user?.id && (
          <Wallet 
            userId={user.id}
            userCoins={currentUser?.coins_balance || 0}
            userUsdt={currentUser?.usdt_balance || 0}
          />
        )}
        
        {activeTab === 'withdrawals' && user?.id && (
          <Withdrawals 
            userId={user.id}
            userUsdt={currentUser?.usdt_balance || 0}
            onWithdrawalComplete={refreshGameState}
          />
        )}
        
        {activeTab === 'admin' && (
          <AdminWithdrawals />
        )}
      </div>
    </div>
  );
}
