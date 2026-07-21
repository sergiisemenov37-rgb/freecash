'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface GameState {
  user: {
    id: string;
    coins_balance: number;
    energy: number;
    max_energy: number;
    coins_per_tap: number;
    total_taps: number;
  };
  boosts: Array<{
    id: string;
    boost_type: string;
    level: number;
    max_level: number;
    is_active: boolean;
  }>;
}

export default function TapGame({ userId }: { userId: string }) {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isTapping, setIsTapping] = useState(false);
  const [tapAnimation, setTapAnimation] = useState<{ x: number; y: number; amount: number } | null>(null);
  const [lastTapTime, setLastTapTime] = useState(0);

  const fetchGameState = useCallback(async () => {
    try {
      const response = await fetch(`/api/game/state?userId=${userId}`);
      const data = await response.json();
      if (data.success) {
        setGameState(data);
      }
    } catch (error) {
      console.error('Failed to fetch game state:', error);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    let mounted = true;
    const loadState = async () => {
      if (mounted) {
        await fetchGameState();
      }
    };
    loadState();
    const interval = setInterval(loadState, 5000); // Refresh every 5 seconds
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [fetchGameState]);

  const handleTap = async (e: React.MouseEvent<HTMLDivElement>) => {
    if (isTapping || !gameState || gameState.user.energy <= 0) return;

    const now = Date.now();
    if (now - lastTapTime < 50) return; // Prevent spam (50ms cooldown)
    setLastTapTime(now);

    setIsTapping(true);

    // Get tap position for animation
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    try {
      const response = await fetch('/api/game/tap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, tapCount: 1 })
      });

      const data = await response.json();
      if (data.success) {
        setGameState({ ...gameState, user: data.user });
        setTapAnimation({ x, y, amount: data.tapReward.coins });
        setTimeout(() => setTapAnimation(null), 500);
      }
    } catch (error) {
      console.error('Tap failed:', error);
    } finally {
      setIsTapping(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-500 to-purple-600">
        <div className="text-white text-xl">Loading game...</div>
      </div>
    );
  }

  if (!gameState) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-500 to-purple-600">
        <div className="text-white text-xl">Failed to load game state</div>
      </div>
    );
  }

  const { user } = gameState;
  const energyPercentage = (user.energy / user.max_energy) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 p-4">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl p-4 mb-4 shadow-2xl">
          <div className="flex justify-between items-center">
            <div>
              <div className="text-3xl font-bold text-blue-600">
                {user.coins_balance.toLocaleString()}
              </div>
              <div className="text-sm text-gray-500">Coins</div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-purple-600">
                {user.energy}/{user.max_energy}
              </div>
              <div className="text-sm text-gray-500">Energy</div>
            </div>
          </div>
          
          {/* Energy Bar */}
          <div className="mt-4 bg-gray-200 rounded-full h-3 overflow-hidden">
            <motion.div
              className="bg-blue-500 h-full rounded-full"
              style={{ width: `${energyPercentage}%` }}
              initial={{ width: 0 }}
              animate={{ width: `${energyPercentage}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>

        {/* Tap Area */}
        <div className="bg-white rounded-2xl p-8 mb-4 shadow-2xl">
          <div
            className="relative w-64 h-64 mx-auto cursor-pointer select-none"
            onClick={handleTap}
            onMouseDown={() => setIsTapping(true)}
            onMouseUp={() => setIsTapping(false)}
            onMouseLeave={() => setIsTapping(false)}
          >
            <motion.div
              className="w-full h-full rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-lg"
              whileTap={{ scale: 0.95 }}
              animate={isTapping ? { scale: 0.95 } : { scale: 1 }}
              transition={{ type: 'spring', stiffness: 400, damping: 17 }}
            >
              <div className="text-white text-6xl font-bold">👆</div>
            </motion.div>

            {/* Tap Animation */}
            <AnimatePresence>
              {tapAnimation && (
                <motion.div
                  className="absolute text-2xl font-bold text-yellow-500 pointer-events-none"
                  initial={{ x: tapAnimation.x, y: tapAnimation.y, opacity: 1, scale: 1 }}
                  animate={{ y: tapAnimation.y - 50, opacity: 0, scale: 1.5 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  +{tapAnimation.amount}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="text-center mt-4 text-gray-600">
            <div className="text-sm">Tap to earn coins!</div>
            <div className="text-xs mt-1">{user.coins_per_tap} coin per tap</div>
          </div>
        </div>

        {/* Stats */}
        <div className="bg-white rounded-2xl p-4 shadow-2xl">
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {user.total_taps.toLocaleString()}
              </div>
              <div className="text-sm text-gray-500">Total Taps</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {user.coins_per_tap}
              </div>
              <div className="text-sm text-gray-500">Coins/Tap</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
