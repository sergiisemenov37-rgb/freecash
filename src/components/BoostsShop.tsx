'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';

interface Boost {
  id: string;
  boost_type: string;
  level: number;
  max_level: number;
  is_active: boolean;
}

interface BoostsShopProps {
  userId: string;
  userCoins: number;
  onPurchase: () => void;
}

const BOOST_CONFIG = {
  x2_coins: {
    name: 'x2 Coins',
    description: 'Double your coins for 30 minutes',
    icon: '💰',
    basePrice: 1000,
    maxLevel: 10
  },
  auto_tap: {
    name: 'Auto Tap',
    description: 'Automatic tapping (10 taps/min)',
    icon: '🤖',
    basePrice: 5000,
    maxLevel: 5
  },
  energy_upgrade: {
    name: 'Energy Upgrade',
    description: '+100 max energy per level',
    icon: '⚡',
    basePrice: 2000,
    maxLevel: 20
  },
  critical_hit: {
    name: 'Critical Hit',
    description: '10% chance for 3x coins',
    icon: '💥',
    basePrice: 3000,
    maxLevel: 10
  }
};

export default function BoostsShop({ userId, userCoins, onPurchase }: BoostsShopProps) {
  const [boosts, setBoosts] = useState<Boost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);

  const fetchBoosts = useCallback(async () => {
    try {
      const response = await fetch(`/api/game/state?userId=${userId}`);
      const data = await response.json();
      if (data.success) {
        setBoosts(data.boosts || []);
      }
    } catch (error) {
      console.error('Failed to fetch boosts:', error);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    let mounted = true;
    const loadBoosts = async () => {
      if (mounted) {
        await fetchBoosts();
      }
    };
    loadBoosts();
    return () => {
      mounted = false;
    };
  }, [fetchBoosts]);

  const calculatePrice = (boostType: string, currentLevel: number): number => {
    const config = BOOST_CONFIG[boostType as keyof typeof BOOST_CONFIG];
    if (!config) return 0;
    const multiplier = boostType === 'x2_coins' ? 2 : boostType === 'auto_tap' ? 1.5 : boostType === 'energy_upgrade' ? 1.8 : 2;
    return Math.floor(config.basePrice * Math.pow(multiplier, currentLevel));
  };

  const handlePurchase = async (boostType: string) => {
    const boost = boosts.find(b => b.boost_type === boostType);
    const currentLevel = boost?.level || 0;
    const price = calculatePrice(boostType, currentLevel);

    if (userCoins < price) {
      alert('Not enough coins!');
      return;
    }

    setPurchasing(boostType);

    try {
      const response = await fetch('/api/game/boosts/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, boostType })
      });

      const data = await response.json();
      if (data.success) {
        onPurchase();
        await fetchBoosts();
      } else {
        alert(data.error || 'Purchase failed');
      }
    } catch (error) {
      console.error('Purchase failed:', error);
      alert('Purchase failed');
    } finally {
      setPurchasing(null);
    }
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading boosts...</div>;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-white mb-4">Boosts Shop</h2>
      
      {Object.entries(BOOST_CONFIG).map(([boostType, config]) => {
        const boost = boosts.find(b => b.boost_type === boostType);
        const currentLevel = boost?.level || 0;
        const price = calculatePrice(boostType, currentLevel);
        const isMaxLevel = currentLevel >= config.maxLevel;
        const canAfford = userCoins >= price;

        return (
          <motion.div
            key={boostType}
            className="bg-white rounded-xl p-4 shadow-lg"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="text-4xl">{config.icon}</div>
                <div>
                  <h3 className="font-bold text-gray-800">{config.name}</h3>
                  <p className="text-sm text-gray-600">{config.description}</p>
                  <div className="text-xs text-gray-500 mt-1">
                    Level: {currentLevel}/{config.maxLevel}
                  </div>
                </div>
              </div>
              
              <button
                onClick={() => handlePurchase(boostType)}
                disabled={isMaxLevel || purchasing === boostType || !canAfford}
                className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                  isMaxLevel
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : canAfford
                    ? 'bg-blue-500 text-white hover:bg-blue-600'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                {purchasing === boostType ? (
                  'Purchasing...'
                ) : isMaxLevel ? (
                  'Max Level'
                ) : (
                  `${price.toLocaleString()} coins`
                )}
              </button>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
