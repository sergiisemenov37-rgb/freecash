'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface GameState {
  user: {
    id: string;
    coins_balance: number;
    usdt_balance: number;
    energy: number;
    max_energy: number;
    coins_per_tap: number;
  };
}

export default function TapGame({ userId }: { userId: string }) {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isTapping, setIsTapping] = useState(false);
  const [tapAnimations, setTapAnimations] = useState<Array<{ id: number; x: number; y: number; amount: number }>>([]);
  const [lastTapTime, setLastTapTime] = useState(0);
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number; vx: number; vy: number }>>([]);

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
    const interval = setInterval(loadState, 5000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [fetchGameState]);

  const handleTap = async (e: React.MouseEvent<HTMLDivElement>) => {
    if (isTapping || !gameState || gameState.user.energy <= 0) return;

    const now = Date.now();
    if (now - lastTapTime < 50) return;
    setLastTapTime(now);

    setIsTapping(true);

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Add tap animation
    const animationId = Date.now();
    setTapAnimations(prev => [...prev, { id: animationId, x, y, amount: gameState.user.coins_per_tap }]);
    setTimeout(() => {
      setTapAnimations(prev => prev.filter(a => a.id !== animationId));
    }, 600);

    // Add particles
    const newParticles = Array.from({ length: 8 }, (_, i) => ({
      id: Date.now() + i,
      x,
      y,
      vx: (Math.random() - 0.5) * 200,
      vy: (Math.random() - 0.5) * 200 - 100
    }));
    setParticles(prev => [...prev, ...newParticles]);
    setTimeout(() => {
      setParticles(prev => prev.filter(p => !newParticles.find(np => np.id === p.id)));
    }, 800);

    try {
      const response = await fetch('/api/game/tap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, tapCount: 1 })
      });

      const data = await response.json();
      if (data.success) {
        setGameState({ ...gameState, user: data.user });
      }
    } catch (error) {
      console.error('Tap failed:', error);
    } finally {
      setIsTapping(false);
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="text-white">Loading game...</div>
      </div>
    );
  }

  if (!gameState) {
    return (
      <div className="text-center py-8">
        <div className="text-white">Failed to load game state</div>
      </div>
    );
  }

  const { user } = gameState;
  const energyPercentage = (user.energy / user.max_energy) * 100;

  return (
    <div className="space-y-6">
      {/* Energy Bar */}
      <div className="rounded-2xl p-4" style={{ backgroundColor: '#151D2B' }}>
        <div className="flex justify-between items-center mb-2">
          <span className="text-white font-medium">Energy</span>
          <span className="text-gray-400 text-sm">{user.energy}/{user.max_energy}</span>
        </div>
        <div className="h-3 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
          <motion.div
            className="h-full rounded-full"
            style={{ 
              background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
              width: `${energyPercentage}%` 
            }}
            initial={{ width: 0 }}
            animate={{ width: `${energyPercentage}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {/* Large Tap Button */}
      <div className="flex justify-center">
        <div
          className="relative cursor-pointer select-none"
          onClick={handleTap}
          onMouseDown={() => setIsTapping(true)}
          onMouseUp={() => setIsTapping(false)}
          onMouseLeave={() => setIsTapping(false)}
          style={{ width: '280px', height: '280px' }}
        >
          {/* Glow Effect */}
          <motion.div
            className="absolute inset-0 rounded-full blur-3xl"
            style={{
              background: 'radial-gradient(circle, rgba(255, 165, 0, 0.4) 0%, rgba(255, 140, 0, 0.2) 50%, transparent 70%)'
            }}
            animate={{
              scale: isTapping ? [1, 0.9, 1] : [1, 1.1, 1],
              opacity: isTapping ? 0.5 : 0.8
            }}
            transition={{
              duration: isTapping ? 0.1 : 2,
              repeat: isTapping ? 0 : Infinity,
              repeatType: 'reverse'
            }}
          />

          {/* Main Button */}
          <motion.div
            className="w-full h-full rounded-full flex items-center justify-center relative overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, #FFA500 0%, #FF8C00 50%, #FF6347 100%)',
              boxShadow: '0 8px 32px rgba(255, 165, 0, 0.4)'
            }}
            whileTap={{ scale: 0.92 }}
            animate={isTapping ? { scale: 0.92 } : { scale: 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 17 }}
          >
            {/* Pulse Animation */}
            <motion.div
              className="absolute inset-0 rounded-full"
              style={{
                background: 'radial-gradient(circle, rgba(255,255,255,0.3) 0%, transparent 70%)'
              }}
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.5, 0.8, 0.5]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                repeatType: 'reverse'
              }}
            />

            {/* Coin Icon */}
            <motion.div
              className="text-8xl"
              animate={{
                rotate: [0, 360],
                y: isTapping ? [0, -10, 0] : 0
              }}
              transition={{
                rotate: { duration: 20, repeat: Infinity, ease: 'linear' },
                y: { duration: 0.1 }
              }}
            >
              🪙
            </motion.div>
          </motion.div>

          {/* Tap Animations */}
          <AnimatePresence>
            {tapAnimations.map((anim) => (
              <motion.div
                key={anim.id}
                className="absolute text-3xl font-bold text-orange-400 pointer-events-none"
                style={{ left: anim.x, top: anim.y }}
                initial={{ opacity: 1, y: 0, scale: 1 }}
                animate={{ opacity: 0, y: -80, scale: 1.5 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.6 }}
              >
                +{anim.amount}
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Particles */}
          <AnimatePresence>
            {particles.map((particle) => (
              <motion.div
                key={particle.id}
                className="absolute w-2 h-2 rounded-full pointer-events-none"
                style={{
                  left: particle.x,
                  top: particle.y,
                  backgroundColor: '#FFA500'
                }}
                initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                animate={{
                  x: particle.vx,
                  y: particle.vy,
                  opacity: 0,
                  scale: 0
                }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.8 }}
              />
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Tap Instructions */}
      <div className="text-center space-y-2">
        <div className="text-white text-lg font-medium">Tap to earn Coins</div>
        <div className="text-gray-400 text-sm">1 Coin per Tap</div>
      </div>
    </div>
  );
}
