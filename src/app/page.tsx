'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import TapGame from '@/components/TapGame';
import Earn from '@/components/Earn';
import Rewards from '@/components/Rewards';
import Friends from '@/components/Friends';
import Wallet from '@/components/Wallet';
import Withdraw from '@/components/Withdraw';

type Tab = 'game' | 'earn' | 'rewards' | 'friends' | 'wallet' | 'withdraw';

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
      <div className="flex items-center justify-center min-h-screen" style={{ backgroundColor: '#0B1220' }}>
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4" style={{ backgroundColor: '#0B1220' }}>
        <div className="rounded-2xl p-8 max-w-md w-full" style={{ backgroundColor: '#151D2B' }}>
          <h1 className="text-3xl font-bold text-white mb-4 text-center">
            Welcome to FreeCoin
          </h1>
          <p className="text-gray-400 mb-6 text-center">
            Please authenticate with Telegram to continue
          </p>
          <button
            onClick={login}
            className="w-full py-3 rounded-xl font-semibold text-white transition-all hover:scale-105"
            style={{ 
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)'
            }}
          >
            Login with Telegram
          </button>
        </div>
      </div>
    );
  }

  const currentUser = gameState?.user || user;

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#0B1220' }}>
      {/* Header - Coins and USDT only */}
      <div className="p-4" style={{ backgroundColor: '#151D2B' }}>
        <div className="max-w-md mx-auto flex gap-3">
          <div className="flex-1 rounded-xl p-4" style={{ 
            background: 'linear-gradient(135deg, rgba(255, 165, 0, 0.1) 0%, rgba(255, 140, 0, 0.2) 100%)',
            border: '1px solid rgba(255, 165, 0, 0.3)'
          }}>
            <div className="text-sm text-orange-400 mb-1">Coins</div>
            <div className="text-2xl font-bold text-orange-500">
              {currentUser?.coins_balance?.toLocaleString() || 0}
            </div>
          </div>
          <div className="flex-1 rounded-xl p-4" style={{ 
            background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.1) 0%, rgba(22, 163, 74, 0.2) 100%)',
            border: '1px solid rgba(34, 197, 94, 0.3)'
          }}>
            <div className="text-sm text-green-400 mb-1">USDT</div>
            <div className="text-2xl font-bold text-green-500">
              {currentUser?.usdt_balance?.toFixed(2) || '0.00'}
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation - 5 tabs only */}
      <div className="fixed bottom-0 left-0 right-0" style={{ backgroundColor: '#151D2B', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
        <div className="max-w-md mx-auto flex">
          {[
            { id: 'game' as Tab, label: 'Game', icon: '🎮' },
            { id: 'earn' as Tab, label: 'Earn', icon: '💰' },
            { id: 'rewards' as Tab, label: 'Rewards', icon: '🎁' },
            { id: 'friends' as Tab, label: 'Friends', icon: '👥' },
            { id: 'wallet' as Tab, label: 'Wallet', icon: '�' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-4 text-center transition-all ${
                activeTab === tab.id
                  ? 'text-white'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              <div className="text-2xl mb-1">{tab.icon}</div>
              <div className="text-xs font-medium">{tab.label}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-md mx-auto p-4 pb-24">
        {activeTab === 'game' && user?.id && (
          <TapGame userId={user.id} />
        )}
        
        {activeTab === 'earn' && user?.id && (
          <Earn 
            userId={user.id} 
            onTaskComplete={refreshGameState}
          />
        )}
        
        {activeTab === 'rewards' && user?.id && (
          <Rewards 
            userId={user.id}
            onClaim={refreshGameState}
          />
        )}
        
        {activeTab === 'friends' && user?.id && (
          <Friends userId={user.id} />
        )}
        
        {activeTab === 'wallet' && user?.id && (
          <Wallet 
            userId={user.id}
            userCoins={currentUser?.coins_balance || 0}
            userUsdt={currentUser?.usdt_balance || 0}
            onWithdraw={() => setActiveTab('withdraw')}
          />
        )}

        {activeTab === 'withdraw' && user?.id && (
          <Withdraw 
            userId={user.id}
            userUsdt={currentUser?.usdt_balance || 0}
            onBack={() => setActiveTab('wallet')}
            onWithdrawalComplete={refreshGameState}
          />
        )}
      </div>
    </div>
  );
}
