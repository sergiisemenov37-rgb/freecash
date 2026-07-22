'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';

interface RewardsProps {
  userId: string;
  onClaim?: () => void;
}

interface DailyReward {
  day: number;
  coins: number;
  usdt: number;
  is_claimed: boolean;
  is_available: boolean;
}

interface Achievement {
  id: string;
  title: string;
  description: string;
  progress: number;
  target: number;
  reward_coins: number;
  reward_usdt: number;
  icon: string;
  is_completed: boolean;
  is_claimed: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default function Rewards({ userId, onClaim }: RewardsProps) {
  const [dailyRewards, setDailyRewards] = useState<DailyReward[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const fetchRewards = useCallback(async () => {
    try {
      // Mock daily rewards data
      const mockDailyRewards: DailyReward[] = [
        { day: 1, coins: 100, usdt: 0.10, is_claimed: true, is_available: false },
        { day: 2, coins: 150, usdt: 0.15, is_claimed: true, is_available: false },
        { day: 3, coins: 200, usdt: 0.20, is_claimed: false, is_available: true },
        { day: 4, coins: 250, usdt: 0.25, is_claimed: false, is_available: false },
        { day: 5, coins: 300, usdt: 0.30, is_claimed: false, is_available: false },
        { day: 6, coins: 400, usdt: 0.40, is_claimed: false, is_available: false },
        { day: 7, coins: 500, usdt: 0.50, is_claimed: false, is_available: false }
      ];
      setDailyRewards(mockDailyRewards);
      setCurrentStreak(2);

      // Mock achievements data
      const mockAchievements: Achievement[] = [
        {
          id: '1',
          title: 'First Steps',
          description: 'Complete your first tap',
          progress: 100,
          target: 1,
          reward_coins: 50,
          reward_usdt: 0.05,
          icon: '👆',
          is_completed: true,
          is_claimed: true
        },
        {
          id: '2',
          title: 'Tap Master',
          description: 'Tap 1000 times',
          progress: 750,
          target: 1000,
          reward_coins: 500,
          reward_usdt: 0.50,
          icon: '🎯',
          is_completed: false,
          is_claimed: false
        },
        {
          id: '3',
          title: 'Social Butterfly',
          description: 'Invite 5 friends',
          progress: 2,
          target: 5,
          reward_coins: 1000,
          reward_usdt: 1.00,
          icon: '👥',
          is_completed: false,
          is_claimed: false
        },
        {
          id: '4',
          title: 'Daily Streak',
          description: 'Maintain 7-day streak',
          progress: 2,
          target: 7,
          reward_coins: 2000,
          reward_usdt: 2.00,
          icon: '🔥',
          is_completed: false,
          is_claimed: false
        }
      ];
      setAchievements(mockAchievements);
    } catch (error) {
      console.error('Failed to fetch rewards:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    const loadData = async () => {
      if (mounted) {
        await fetchRewards();
      }
    };
    loadData();
    return () => {
      mounted = false;
    };
  }, [fetchRewards]);

  const handleClaimDaily = async (day: number) => {
    const reward = dailyRewards.find(r => r.day === day);
    if (!reward || !reward.is_available || reward.is_claimed) return;

    // Claim reward (in production, this would call API)
    setDailyRewards(prev => prev.map(r => 
      r.day === day ? { ...r, is_claimed: true, is_available: false } : r
    ));
    setCurrentStreak(prev => prev + 1);
    
    if (onClaim) {
      onClaim();
    }
  };

  const handleClaimAchievement = async (achievementId: string) => {
    const achievement = achievements.find(a => a.id === achievementId);
    if (!achievement || !achievement.is_completed || achievement.is_claimed) return;

    // Claim reward (in production, this would call API)
    setAchievements(prev => prev.map(a => 
      a.id === achievementId ? { ...a, is_claimed: true } : a
    ));
    
    if (onClaim) {
      onClaim();
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="text-white">Loading rewards...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Daily Rewards Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">Daily Rewards</h2>
          <div className="flex items-center gap-2">
            <span className="text-orange-400">🔥</span>
            <span className="text-orange-500 font-medium">{currentStreak} Day Streak</span>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-2 mb-4">
          {dailyRewards.map((reward, index) => (
            <motion.div
              key={reward.day}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
              className={`rounded-xl p-3 text-center transition-all ${
                reward.is_claimed
                  ? 'bg-green-500/10 border border-green-500/30'
                  : reward.is_available
                  ? 'bg-blue-500/10 border border-blue-500/30 cursor-pointer hover:scale-105'
                  : 'bg-gray-500/10 border border-gray-500/30 opacity-50'
              }`}
              onClick={() => reward.is_available && handleClaimDaily(reward.day)}
              style={{ backgroundColor: '#151D2B' }}
            >
              <div className="text-xs text-gray-400 mb-1">Day {reward.day}</div>
              <div className="text-lg mb-1">{reward.is_claimed ? '✅' : '🎁'}</div>
              <div className="text-xs text-orange-400">{reward.coins}</div>
              <div className="text-xs text-green-400">{reward.usdt.toFixed(2)}</div>
            </motion.div>
          ))}
        </div>

        {dailyRewards.some(r => r.is_available && !r.is_claimed) && (
          <button
            onClick={() => {
              const available = dailyRewards.find(r => r.is_available && !r.is_claimed);
              if (available) handleClaimDaily(available.day);
            }}
            className="w-full py-3 rounded-xl font-medium text-white transition-all hover:scale-105"
            style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)'
            }}
          >
            Claim Daily Reward
          </button>
        )}
      </div>

      {/* Achievements Section */}
      <div>
        <h2 className="text-xl font-bold text-white mb-4">Achievements</h2>
        
        <div className="space-y-4">
          {achievements.map((achievement, index) => (
            <motion.div
              key={achievement.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="rounded-2xl p-4 border transition-all hover:scale-[1.02]"
              style={{ 
                backgroundColor: '#151D2B',
                borderColor: achievement.is_completed ? 'rgba(34, 197, 94, 0.3)' : 'rgba(255, 255, 255, 0.1)'
              }}
            >
              <div className="flex items-start gap-4">
                <div className="text-3xl">{achievement.icon}</div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-white">{achievement.title}</h3>
                    {achievement.is_claimed && (
                      <span className="px-2 py-0.5 rounded-full text-xs bg-green-500/20 text-green-400">
                        Claimed
                      </span>
                    )}
                    {achievement.is_completed && !achievement.is_claimed && (
                      <span className="px-2 py-0.5 rounded-full text-xs bg-blue-500/20 text-blue-400">
                        Ready to Claim
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-400 mb-3">{achievement.description}</p>
                  
                  {/* Progress Bar */}
                  <div className="mb-3">
                    <div className="flex justify-between text-xs text-gray-400 mb-1">
                      <span>Progress</span>
                      <span>{achievement.progress}/{achievement.target}</span>
                    </div>
                    <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(achievement.progress / achievement.target) * 100}%` }}
                        transition={{ duration: 0.5 }}
                        className="h-full rounded-full"
                        style={{
                          background: achievement.is_completed 
                            ? 'linear-gradient(90deg, #22c55e 0%, #16a34a 100%)'
                            : 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)'
                        }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-4 mb-3">
                    {achievement.reward_coins > 0 && (
                      <div className="flex items-center gap-1">
                        <span className="text-orange-400">+</span>
                        <span className="font-medium text-orange-500">{achievement.reward_coins}</span>
                        <span className="text-orange-400 text-sm">Coins</span>
                      </div>
                    )}
                    {achievement.reward_usdt > 0 && (
                      <div className="flex items-center gap-1">
                        <span className="text-green-400">+</span>
                        <span className="font-medium text-green-500">{achievement.reward_usdt.toFixed(2)}</span>
                        <span className="text-green-400 text-sm">USDT</span>
                      </div>
                    )}
                  </div>

                  {achievement.is_completed && !achievement.is_claimed && (
                    <button
                      onClick={() => handleClaimAchievement(achievement.id)}
                      className="w-full py-3 rounded-xl font-medium text-white transition-all hover:scale-105"
                      style={{
                        background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                        boxShadow: '0 4px 15px rgba(34, 197, 94, 0.4)'
                      }}
                    >
                      Claim Reward
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
