'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';

interface EarnProps {
  userId: string;
  onTaskComplete?: () => void;
}

interface Task {
  id: string;
  type: 'cpa' | 'daily' | 'social';
  icon: string;
  title: string;
  description: string;
  reward_coins: number;
  reward_usdt: number;
  link?: string;
  is_completed: boolean;
  is_claimed: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default function Earn({ userId, onTaskComplete }: EarnProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'all' | 'cpa' | 'daily' | 'social'>('all');

  const fetchTasks = useCallback(async () => {
    try {
      // In production, this would fetch from API
      // For now, using mock data
      const mockTasks: Task[] = [
        {
          id: '1',
          type: 'cpa',
          icon: '🎯',
          title: 'Complete Survey',
          description: 'Answer a quick survey about your preferences',
          reward_coins: 500,
          reward_usdt: 0.50,
          link: '#',
          is_completed: false,
          is_claimed: false
        },
        {
          id: '2',
          type: 'cpa',
          icon: '📱',
          title: 'Download App',
          description: 'Download and try our partner app',
          reward_coins: 1000,
          reward_usdt: 1.00,
          link: '#',
          is_completed: false,
          is_claimed: false
        },
        {
          id: '3',
          type: 'daily',
          icon: '📊',
          title: 'Daily Check-in',
          description: 'Check in daily to earn rewards',
          reward_coins: 100,
          reward_usdt: 0.10,
          is_completed: false,
          is_claimed: false
        },
        {
          id: '4',
          type: 'social',
          icon: '🐦',
          title: 'Follow on Twitter',
          description: 'Follow our official Twitter account',
          reward_coins: 200,
          reward_usdt: 0.20,
          link: '#',
          is_completed: false,
          is_claimed: false
        },
        {
          id: '5',
          type: 'social',
          icon: '📺',
          title: 'Join Telegram Channel',
          description: 'Join our Telegram community',
          reward_coins: 300,
          reward_usdt: 0.30,
          link: '#',
          is_completed: false,
          is_claimed: false
        },
        {
          id: '6',
          type: 'cpa',
          icon: '🎮',
          title: 'Play Game',
          description: 'Play a game for 5 minutes',
          reward_coins: 750,
          reward_usdt: 0.75,
          link: '#',
          is_completed: false,
          is_claimed: false
        }
      ];
      setTasks(mockTasks);
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    const loadTasks = async () => {
      if (mounted) {
        await fetchTasks();
      }
    };
    loadTasks();
    return () => {
      mounted = false;
    };
  }, [fetchTasks]);

  const handleTaskClick = async (task: Task) => {
    if (task.is_completed) return;
    
    if (task.link) {
      window.open(task.link, '_blank');
    }
    
    // Mark as completed (in production, this would call API)
    setTasks(prev => prev.map(t => 
      t.id === task.id ? { ...t, is_completed: true } : t
    ));
    
    if (onTaskComplete) {
      onTaskComplete();
    }
  };

  const handleClaim = async (task: Task) => {
    if (!task.is_completed || task.is_claimed) return;
    
    // Claim reward (in production, this would call API)
    setTasks(prev => prev.map(t => 
      t.id === task.id ? { ...t, is_claimed: true } : t
    ));
    
    if (onTaskComplete) {
      onTaskComplete();
    }
  };

  const filteredTasks = activeFilter === 'all' 
    ? tasks 
    : tasks.filter(task => task.type === activeFilter);


  const getTaskColor = (type: string) => {
    const colors: { [key: string]: string } = {
      cpa: 'from-blue-500/20 to-blue-600/20 border-blue-500/30',
      daily: 'from-purple-500/20 to-purple-600/20 border-purple-500/30',
      social: 'from-green-500/20 to-green-600/20 border-green-500/30'
    };
    return colors[type] || 'from-gray-500/20 to-gray-600/20 border-gray-500/30';
  };

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="text-white">Loading tasks...</div>
      </div>
    );
  }

  return (
    <div>
      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {[
          { id: 'all' as const, label: 'All' },
          { id: 'cpa' as const, label: 'CPA' },
          { id: 'daily' as const, label: 'Daily' },
          { id: 'social' as const, label: 'Social' }
        ].map((filter) => (
          <button
            key={filter.id}
            onClick={() => setActiveFilter(filter.id)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
              activeFilter === filter.id
                ? 'text-white'
                : 'text-gray-400 hover:text-white'
            }`}
            style={{
              backgroundColor: activeFilter === filter.id ? '#151D2B' : 'transparent',
              border: activeFilter === filter.id ? '1px solid rgba(255,255,255,0.1)' : '1px solid transparent'
            }}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {/* Tasks List */}
      <div className="space-y-4">
        {filteredTasks.map((task, index) => (
          <motion.div
            key={task.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className={`rounded-2xl p-4 border transition-all hover:scale-[1.02] ${getTaskColor(task.type)}`}
            style={{ backgroundColor: '#151D2B' }}
          >
            <div className="flex items-start gap-4">
              <div className="text-3xl">{task.icon}</div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-white">{task.title}</h3>
                  {task.is_claimed && (
                    <span className="px-2 py-0.5 rounded-full text-xs bg-green-500/20 text-green-400">
                      Claimed
                    </span>
                  )}
                  {task.is_completed && !task.is_claimed && (
                    <span className="px-2 py-0.5 rounded-full text-xs bg-blue-500/20 text-blue-400">
                      Ready to Claim
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-400 mb-3">{task.description}</p>
                
                <div className="flex items-center gap-4 mb-3">
                  {task.reward_coins > 0 && (
                    <div className="flex items-center gap-1">
                      <span className="text-orange-400">+</span>
                      <span className="font-medium text-orange-500">{task.reward_coins}</span>
                      <span className="text-orange-400 text-sm">Coins</span>
                    </div>
                  )}
                  {task.reward_usdt > 0 && (
                    <div className="flex items-center gap-1">
                      <span className="text-green-400">+</span>
                      <span className="font-medium text-green-500">{task.reward_usdt.toFixed(2)}</span>
                      <span className="text-green-400 text-sm">USDT</span>
                    </div>
                  )}
                </div>

                {!task.is_claimed && (
                  <button
                    onClick={() => task.is_completed ? handleClaim(task) : handleTaskClick(task)}
                    className="w-full py-3 rounded-xl font-medium text-white transition-all hover:scale-105"
                    style={{
                      background: task.is_completed 
                        ? 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)'
                        : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      boxShadow: task.is_completed
                        ? '0 4px 15px rgba(34, 197, 94, 0.4)'
                        : '0 4px 15px rgba(102, 126, 234, 0.4)'
                    }}
                  >
                    {task.is_completed ? 'Claim Reward' : 'Start Task'}
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {filteredTasks.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-500 text-lg">No tasks found</div>
          <div className="text-gray-600 text-sm mt-2">Try a different filter</div>
        </div>
      )}
    </div>
  );
}
