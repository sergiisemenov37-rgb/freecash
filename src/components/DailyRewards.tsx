'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';

interface DailyRewardsProps {
  userId: string;
  onClaim: () => void;
}

const DAILY_REWARDS = [100, 150, 200, 300, 400, 500, 1000];

export default function DailyRewards({ userId, onClaim }: DailyRewardsProps) {
  const [dailyRewards, setDailyRewards] = useState<{
    streak: number;
    last_claim: string | null;
    total_claims: number;
    claim_history: string[];
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isClaiming, setIsClaiming] = useState(false);

  const fetchDailyRewards = useCallback(async () => {
    try {
      const response = await fetch(`/api/game/state?userId=${userId}`);
      const data = await response.json();
      if (data.success) {
        setDailyRewards(data.dailyRewards);
      }
    } catch (error) {
      console.error('Failed to fetch daily rewards:', error);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    let mounted = true;
    const loadRewards = async () => {
      if (mounted) {
        await fetchDailyRewards();
      }
    };
    loadRewards();
    return () => {
      mounted = false;
    };
  }, [fetchDailyRewards]);

  const canClaim = useCallback(() => {
    if (!dailyRewards) return true;
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const lastClaim = dailyRewards.last_claim ? new Date(dailyRewards.last_claim) : null;
    const lastClaimDate = lastClaim ? lastClaim.toISOString().split('T')[0] : null;
    return lastClaimDate !== today;
  }, [dailyRewards]);

  const getNextClaimTime = useCallback(() => {
    if (!dailyRewards?.last_claim) return null;
    const lastClaim = new Date(dailyRewards.last_claim);
    const nextClaim = new Date(lastClaim);
    nextClaim.setHours(24, 0, 0, 0);
    return nextClaim;
  }, [dailyRewards]);

  const handleClaim = async () => {
    setIsClaiming(true);

    try {
      const response = await fetch('/api/game/daily-rewards/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });

      const data = await response.json();
      if (data.success) {
        onClaim();
        await fetchDailyRewards();
      } else {
        alert(data.error || 'Claim failed');
      }
    } catch (error) {
      console.error('Claim failed:', error);
      alert('Claim failed');
    } finally {
      setIsClaiming(false);
    }
  };

  const [timeUntilNextClaim, setTimeUntilNextClaim] = useState<number | null>(null);

  const currentStreak = dailyRewards?.streak || 0;
  const dayIndex = currentStreak % 7;
  const canClaimToday = canClaim();

  useEffect(() => {
    if (!canClaimToday && getNextClaimTime()) {
      const updateTime = () => {
        const nextClaim = getNextClaimTime();
        if (nextClaim) {
          setTimeUntilNextClaim(Math.ceil((nextClaim.getTime() - Date.now()) / (1000 * 60 * 60)));
        }
      };
      updateTime();
      const interval = setInterval(updateTime, 60000); // Update every minute
      return () => clearInterval(interval);
    }
  }, [dailyRewards?.last_claim, canClaimToday, getNextClaimTime]);

  if (isLoading) {
    return <div className="text-center py-8">Loading daily rewards...</div>;
  }

  return (
    <div className="bg-white rounded-2xl p-6 shadow-2xl">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">Daily Rewards</h2>
      
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-gray-600">Current Streak</span>
          <span className="text-2xl font-bold text-purple-600">{currentStreak} days</span>
        </div>
        <div className="text-sm text-gray-500">
          Total claims: {dailyRewards?.total_claims || 0}
        </div>
      </div>

      <div className="grid grid-cols-7 gap-2 mb-4">
        {DAILY_REWARDS.map((reward, index) => {
          const isPastDay = index < dayIndex;
          const isCurrentDay = index === dayIndex;

          return (
            <motion.div
              key={index}
              className={`rounded-lg p-2 text-center ${
                isPastDay
                  ? 'bg-green-100 border-2 border-green-500'
                  : isCurrentDay
                  ? 'bg-blue-100 border-2 border-blue-500'
                  : 'bg-gray-100 border-2 border-gray-300'
              }`}
              whileHover={{ scale: 1.05 }}
            >
              <div className="text-xs text-gray-600 mb-1">Day {index + 1}</div>
              <div className="text-sm font-bold text-gray-800">{reward}</div>
              {isPastDay && <div className="text-xs text-green-600 mt-1">✓</div>}
              {isCurrentDay && canClaimToday && (
                <div className="text-xs text-blue-600 mt-1">Claim!</div>
              )}
            </motion.div>
          );
        })}
      </div>

      {!canClaimToday && timeUntilNextClaim !== null && (
        <div className="text-center text-sm text-gray-500 mb-4">
          Next claim available in: {timeUntilNextClaim} hours
        </div>
      )}

      <button
        onClick={handleClaim}
        disabled={!canClaimToday || isClaiming}
        className={`w-full py-3 rounded-xl font-semibold transition-colors ${
          canClaimToday
            ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:from-blue-600 hover:to-purple-600'
            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
        }`}
      >
        {isClaiming ? (
          'Claiming...'
        ) : canClaimToday ? (
          `Claim ${DAILY_REWARDS[dayIndex]} Coins`
        ) : (
          'Already Claimed Today'
        )}
      </button>
    </div>
  );
}
