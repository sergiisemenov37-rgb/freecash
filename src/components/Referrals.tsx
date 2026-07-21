'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';

interface ReferralStats {
  total_invited: number;
  active_referrals: number;
  coins_earned: number;
  usdt_earned: number;
  today_referrals: number;
  month_referrals: number;
}

interface ReferralsProps {
  userId: string;
}

export default function Referrals({ userId }: ReferralsProps) {
  const [referralCode, setReferralCode] = useState<string>('');
  const [referralLink, setReferralLink] = useState<string>('');
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const fetchReferralData = useCallback(async () => {
    try {
      const response = await fetch(`/api/referrals/stats?userId=${userId}`);
      const data = await response.json();
      if (data.success) {
        setReferralCode(data.referralCode);
        setReferralLink(data.referralLink);
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Failed to fetch referral data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

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
      await navigator.clipboard.writeText(referralCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading referral data...</div>;
  }

  return (
    <div className="bg-white rounded-2xl p-6 shadow-2xl">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Referral Program</h2>
      
      {/* Referral Code and Link */}
      <div className="mb-6 space-y-4">
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-4">
          <div className="text-sm text-gray-600 mb-2">Your Referral Code</div>
          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold text-purple-600">{referralCode}</span>
            <button
              onClick={handleCopyCode}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>

        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4">
          <div className="text-sm text-gray-600 mb-2">Referral Link</div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm text-blue-600 truncate flex-1">{referralLink}</span>
            <button
              onClick={handleCopyLink}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4"
        >
          <div className="text-sm text-gray-600">Total Invited</div>
          <div className="text-2xl font-bold text-green-600">{stats?.total_invited || 0}</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-4"
        >
          <div className="text-sm text-gray-600">Active Referrals</div>
          <div className="text-2xl font-bold text-blue-600">{stats?.active_referrals || 0}</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gradient-to-br from-yellow-50 to-amber-50 rounded-xl p-4"
        >
          <div className="text-sm text-gray-600">Coins Earned</div>
          <div className="text-2xl font-bold text-yellow-600">{stats?.coins_earned?.toFixed(2) || '0.00'}</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-4"
        >
          <div className="text-sm text-gray-600">USDT Earned</div>
          <div className="text-2xl font-bold text-purple-600">{stats?.usdt_earned?.toFixed(2) || '0.00'}</div>
        </motion.div>
      </div>

      {/* Time-based stats */}
      <div className="bg-gray-50 rounded-xl p-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-sm text-gray-600">Today&apos;s Referrals</div>
            <div className="text-xl font-bold text-gray-800">{stats?.today_referrals || 0}</div>
          </div>
          <div>
            <div className="text-sm text-gray-600">This Month</div>
            <div className="text-xl font-bold text-gray-800">{stats?.month_referrals || 0}</div>
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="mt-6 text-sm text-gray-500 text-center">
        <p>Share your referral link and earn 5% of your friends&apos; earnings!</p>
      </div>
    </div>
  );
}
