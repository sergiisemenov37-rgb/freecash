'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';

interface Boost {
  id: string;
  name: string;
  description: string;
  icon: string;
  type: 'multitap' | 'energy_limit' | 'recharging_speed';
  current_level: number;
  max_level: number;
  base_cost: number;
  cost_multiplier: number;
  effect_per_level: number;
}

interface BoostsProps {
  userId: string;
  userCoins: number;
  onBoostPurchase?: () => void;
}

export default function Boosts({ userId, userCoins, onBoostPurchase }: BoostsProps) {
  const [boosts, setBoosts] = useState<Boost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPurchasing, setIsPurchasing] = useState<string | null>(null);

  const fetchBoosts = useCallback(async () => {
    try {
      const response = await fetch(`/api/game/boosts?userId=${userId}`);
      const data = await response.json();
      if (data.success) {
        setBoosts(data.boosts);
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

  const calculateCost = (boost: Boost) => {
    return Math.floor(boost.base_cost * Math.pow(boost.cost_multiplier, boost.current_level));
  };

  const calculateEffect = (boost: Boost) => {
    return (boost.current_level * boost.effect_per_level).toFixed(1);
  };

  const handlePurchase = async (boost: Boost) => {
    const cost = calculateCost(boost);
    
    if (userCoins < cost) {
      alert('Insufficient coins');
      return;
    }

    if (boost.current_level >= boost.max_level) {
      alert('Maximum level reached');
      return;
    }

    setIsPurchasing(boost.id);

    try {
      const response = await fetch('/api/game/boosts/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          boostType: boost.id
        })
      });

      const data = await response.json();

      if (data.success) {
        setBoosts(prev => prev.map(b => 
          b.id === boost.id ? { ...b, current_level: b.current_level + 1 } : b
        ));
        if (onBoostPurchase) {
          onBoostPurchase();
        }
      } else {
        alert(data.error || 'Purchase failed');
      }
    } catch {
      alert('Failed to purchase boost');
    } finally {
      setIsPurchasing(null);
    }
  };

  const getBoostColor = (type: string) => {
    const colors: { [key: string]: string } = {
      multitap: 'from-blue-500/20 to-blue-600/20 border-blue-500/30',
      energy_limit: 'from-yellow-500/20 to-yellow-600/20 border-yellow-500/30',
      recharging_speed: 'from-green-500/20 to-green-600/20 border-green-500/30'
    };
    return colors[type] || 'from-purple-500/20 to-purple-600/20 border-purple-500/30';
  };

  if (isLoading) {
    return (
      <div className="text-center py-4">
        <div className="text-gray-400 text-sm">Loading boosts...</div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-white font-semibold text-sm mb-3">Boosts</h3>
      
      {boosts.map((boost, index) => {
        const cost = calculateCost(boost);
        const canAfford = userCoins >= cost;
        const isMaxed = boost.current_level >= boost.max_level;

        return (
          <motion.div
            key={boost.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`rounded-xl p-3 border transition-all ${getBoostColor(boost.type)}`}
            style={{ backgroundColor: '#151D2B' }}
          >
            <div className="flex items-center gap-3">
              <div className="text-2xl">{boost.icon}</div>
              <div className="flex-1 min-w-0">
                <div className="text-white font-medium text-sm truncate">{boost.name}</div>
                <div className="text-gray-400 text-xs truncate">{boost.description}</div>
                <div className="flex items-center gap-2 mt-1">
                  <div className="text-xs text-gray-500">
                    Level: {boost.current_level}/{boost.max_level}
                  </div>
                  <div className="text-xs text-orange-400">
                    +{calculateEffect(boost)}
                  </div>
                </div>
              </div>
              <button
                onClick={() => handlePurchase(boost)}
                disabled={!canAfford || isMaxed || isPurchasing === boost.id}
                className="px-3 py-2 rounded-lg text-xs font-medium text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105"
                style={{
                  background: isMaxed 
                    ? 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)'
                    : canAfford
                    ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                    : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
                }}
              >
                {isPurchasing === boost.id ? '...' : isMaxed ? 'MAX' : `${cost} 🪙`}
              </button>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
