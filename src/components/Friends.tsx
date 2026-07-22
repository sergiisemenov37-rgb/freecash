'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';

interface FriendsProps {
  userId: string;
}

interface ReferralStats {
  referral_code: string;
  total_invited: number;
  active_referrals: number;
  coins_earned: number;
  usdt_earned: number;
  today_referrals: number;
  month_referrals: number;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default function Friends({ userId }: FriendsProps) {
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [referralLink, setReferralLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const fetchReferralData = useCallback(async () => {
    try {
      // Mock data - in production, this would fetch from API
      const mockStats: ReferralStats = {
        referral_code: 'FREE123456',
        total_invited: 12,
        active_referrals: 8,
        coins_earned: 2500,
        usdt_earned: 12.50,
        today_referrals: 2,
        month_referrals: 5
      };
      setStats(mockStats);
      setReferralLink(`https://t.me/FreeCoinWeb_bot/app?startapp=${mockStats.referral_code}`);
    } catch (error) {
      console.error('Failed to fetch referral data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    const loadData = async () => {
      if (mounted) {
        await fetchReferralData();
      }
    };
    loadData();
    return () => {
      mounted = false;
    };
  }, [fetchReferralData]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(stats?.referral_code || '');
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="text-white">Loading referral data...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Referral Link Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl p-6 border"
        style={{ backgroundColor: '#151D2B', borderColor: 'rgba(102, 126, 234, 0.3)' }}
      >
        <h2 className="text-xl font-bold text-white mb-4">Invite Friends</h2>
        
        <div className="mb-4">
          <label className="text-sm text-gray-400 mb-2 block">Your Referral Link</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={referralLink}
              readOnly
              className="flex-1 px-4 py-3 rounded-xl text-white text-sm"
              style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
            />
            <button
              onClick={handleCopyLink}
              className="px-4 py-3 rounded-xl text-white transition-all hover:scale-105"
              style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)'
              }}
            >
              {copied ? '✓' : '📋'}
            </button>
          </div>
        </div>

        <div className="mb-4">
          <label className="text-sm text-gray-400 mb-2 block">Your Referral Code</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={stats?.referral_code || ''}
              readOnly
              className="flex-1 px-4 py-3 rounded-xl text-white text-sm font-mono"
              style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
            />
            <button
              onClick={handleCopyCode}
              className="px-4 py-3 rounded-xl text-white transition-all hover:scale-105"
              style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)'
              }}
            >
              {copied ? '✓' : '📋'}
            </button>
          </div>
        </div>

        <button
          onClick={() => {
            const text = `Join FreeCoin and earn rewards! Use my referral link: ${referralLink}`;
            const url = `https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent(text)}`;
            window.open(url, '_blank');
          }}
          className="w-full py-4 rounded-xl font-medium text-white transition-all hover:scale-105"
          style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)'
          }}
        >
          📤 Share with Friends
        </button>
      </motion.div>

      {/* Statistics Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-2xl p-6 border"
        style={{ backgroundColor: '#151D2B', borderColor: 'rgba(255,255,255,0.1)' }}
      >
        <h2 className="text-xl font-bold text-white mb-4">Your Statistics</h2>
        
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="rounded-xl p-4 text-center" style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}>
            <div className="text-3xl mb-2">👥</div>
            <div className="text-2xl font-bold text-white">{stats?.total_invited || 0}</div>
            <div className="text-sm text-gray-400">Total Invited</div>
          </div>
          <div className="rounded-xl p-4 text-center" style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}>
            <div className="text-3xl mb-2">✅</div>
            <div className="text-2xl font-bold text-white">{stats?.active_referrals || 0}</div>
            <div className="text-sm text-gray-400">Active Referrals</div>
          </div>
          <div className="rounded-xl p-4 text-center" style={{ backgroundColor: 'rgba(255,165,0,0.1)' }}>
            <div className="text-3xl mb-2">🪙</div>
            <div className="text-2xl font-bold text-orange-500">{stats?.coins_earned?.toLocaleString() || 0}</div>
            <div className="text-sm text-orange-400">Coins Earned</div>
          </div>
          <div className="rounded-xl p-4 text-center" style={{ backgroundColor: 'rgba(34,197,94,0.1)' }}>
            <div className="text-3xl mb-2">💵</div>
            <div className="text-2xl font-bold text-green-500">{stats?.usdt_earned?.toFixed(2) || '0.00'}</div>
            <div className="text-sm text-green-400">USDT Earned</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-xl p-4 text-center" style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}>
            <div className="text-lg font-bold text-white">{stats?.today_referrals || 0}</div>
            <div className="text-sm text-gray-400">Today</div>
          </div>
          <div className="rounded-xl p-4 text-center" style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}>
            <div className="text-lg font-bold text-white">{stats?.month_referrals || 0}</div>
            <div className="text-sm text-gray-400">This Month</div>
          </div>
        </div>
      </motion.div>

      {/* Referral Rules Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="rounded-2xl p-6 border"
        style={{ backgroundColor: '#151D2B', borderColor: 'rgba(255,255,255,0.1)' }}
      >
        <h2 className="text-xl font-bold text-white mb-4">How It Works</h2>
        
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold" style={{ backgroundColor: 'rgba(102, 126, 234, 0.3)' }}>
              1
            </div>
            <div className="flex-1">
              <div className="text-white font-medium mb-1">Share Your Link</div>
              <div className="text-sm text-gray-400">Send your referral link to friends</div>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold" style={{ backgroundColor: 'rgba(102, 126, 234, 0.3)' }}>
              2
            </div>
            <div className="flex-1">
              <div className="text-white font-medium mb-1">Friend Earns Coins</div>
              <div className="text-sm text-gray-400">Your friend taps and earns coins</div>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-orange-500 text-sm font-bold" style={{ backgroundColor: 'rgba(255, 165, 0, 0.2)' }}>
              ↓
            </div>
            <div className="flex-1">
              <div className="text-orange-500 font-bold mb-1">You receive 5% of Coins</div>
              <div className="text-sm text-gray-400">Get 5% of their coin earnings</div>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold" style={{ backgroundColor: 'rgba(102, 126, 234, 0.3)' }}>
              3
            </div>
            <div className="flex-1">
              <div className="text-white font-medium mb-1">Friend Earns USDT</div>
              <div className="text-sm text-gray-400">Your friend completes tasks and earns USDT</div>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-green-500 text-sm font-bold" style={{ backgroundColor: 'rgba(34, 197, 94, 0.2)' }}>
              ↓
            </div>
            <div className="flex-1">
              <div className="text-green-500 font-bold mb-1">You receive 5% of USDT</div>
              <div className="text-sm text-gray-400">Get 5% of their USDT earnings</div>
            </div>
          </div>
        </div>

        <div className="mt-6 p-4 rounded-xl" style={{ backgroundColor: 'rgba(102, 126, 234, 0.1)' }}>
          <div className="text-sm text-gray-300">
            <span className="text-orange-400 font-bold">5%</span> of Coins + <span className="text-green-400 font-bold">5%</span> of USDT from every friend you invite!
          </div>
        </div>
      </motion.div>
    </div>
  );
}
