'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';

interface Mission {
  id: string;
  mission_type: string;
  title: string;
  description: string;
  requirement_type: string;
  requirement_target: number;
  reward_coins: number;
  reward_usdt: number;
}

interface UserMission {
  id: string;
  progress: number;
  is_completed: boolean;
  is_claimed: boolean;
  missions: Mission;
}

interface MissionsProps {
  userId: string;
  onClaim: () => void;
}

export default function Missions({ userId, onClaim }: MissionsProps) {
  const [missions, setMissions] = useState<UserMission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [claiming, setClaiming] = useState<string | null>(null);

  const fetchMissions = useCallback(async () => {
    try {
      const response = await fetch(`/api/game/state?userId=${userId}`);
      const data = await response.json();
      if (data.success) {
        setMissions(data.missions || []);
      }
    } catch (error) {
      console.error('Failed to fetch missions:', error);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    let mounted = true;
    const loadMissions = async () => {
      if (mounted) {
        await fetchMissions();
      }
    };
    loadMissions();
    return () => {
      mounted = false;
    };
  }, [fetchMissions]);

  const handleClaim = async (missionId: string) => {
    setClaiming(missionId);

    try {
      const response = await fetch('/api/game/missions/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, missionId })
      });

      const data = await response.json();
      if (data.success) {
        onClaim();
        await fetchMissions();
      } else {
        alert(data.error || 'Claim failed');
      }
    } catch (error) {
      console.error('Claim failed:', error);
      alert('Claim failed');
    } finally {
      setClaiming(null);
    }
  };

  const getProgressPercentage = (progress: number, target: number) => {
    return Math.min(100, (progress / target) * 100);
  };

  const getMissionIcon = (requirementType: string) => {
    switch (requirementType) {
      case 'taps': return '👆';
      case 'coins': return '💰';
      case 'invites': return '👥';
      case 'daily_reward': return '🎁';
      case 'boost_purchase': return '⚡';
      default: return '🎯';
    }
  };

  const getMissionTypeColor = (missionType: string) => {
    switch (missionType) {
      case 'daily': return 'bg-blue-100 text-blue-800';
      case 'weekly': return 'bg-purple-100 text-purple-800';
      case 'achievement': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading missions...</div>;
  }

  const completedMissions = missions.filter(m => m.is_completed);
  const availableMissions = missions.filter(m => !m.is_completed);

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-white mb-4">Missions</h2>
      
      {/* Completed Missions */}
      {completedMissions.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-white">Completed</h3>
          {completedMissions.map((userMission) => (
            <motion.div
              key={userMission.id}
              className="bg-green-50 border-2 border-green-500 rounded-xl p-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="text-3xl">{getMissionIcon(userMission.missions.requirement_type)}</div>
                  <div>
                    <h4 className="font-bold text-gray-800">{userMission.missions.title}</h4>
                    <p className="text-sm text-gray-600">{userMission.missions.description}</p>
                    <div className="text-xs text-green-600 mt-1">
                      {userMission.is_claimed ? '✓ Reward claimed' : 'Ready to claim'}
                    </div>
                  </div>
                </div>
                
                {!userMission.is_claimed && (
                  <button
                    onClick={() => handleClaim(userMission.missions.id)}
                    disabled={claiming === userMission.missions.id}
                    className="px-4 py-2 bg-green-500 text-white rounded-lg font-semibold hover:bg-green-600 transition-colors disabled:bg-gray-300"
                  >
                    {claiming === userMission.missions.id ? 'Claiming...' : 'Claim Reward'}
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Available Missions */}
      {availableMissions.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-white">In Progress</h3>
          {availableMissions.map((userMission) => {
            const progress = getProgressPercentage(userMission.progress, userMission.missions.requirement_target);
            
            return (
              <motion.div
                key={userMission.id}
                className="bg-white rounded-xl p-4 shadow-lg"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="text-3xl">{getMissionIcon(userMission.missions.requirement_type)}</div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-gray-800">{userMission.missions.title}</h4>
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getMissionTypeColor(userMission.missions.mission_type)}`}>
                          {userMission.missions.mission_type}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">{userMission.missions.description}</p>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-lg font-bold text-purple-600">
                      {userMission.missions.reward_coins > 0 && `${userMission.missions.reward_coins} coins`}
                      {userMission.missions.reward_usdt > 0 && ` + ${userMission.missions.reward_usdt} USDT`}
                    </div>
                  </div>
                </div>

                <div className="mb-2">
                  <div className="flex justify-between text-sm text-gray-600 mb-1">
                    <span>Progress</span>
                    <span>{userMission.progress}/{userMission.missions.requirement_target}</span>
                  </div>
                  <div className="bg-gray-200 rounded-full h-2 overflow-hidden">
                    <motion.div
                      className="bg-purple-500 h-full rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {missions.length === 0 && (
        <div className="text-center py-8 text-white">
          No missions available
        </div>
      )}
    </div>
  );
}
