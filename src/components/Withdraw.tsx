'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';

interface WithdrawProps {
  userId: string;
  userUsdt: number;
  onBack?: () => void;
  onWithdrawalComplete?: () => void;
}

interface WithdrawalRequest {
  id: string;
  amount: number;
  fee: number;
  network: string;
  wallet_address: string;
  status: string;
  created_at: string;
}

export default function Withdraw({ userId, userUsdt, onBack, onWithdrawalComplete }: WithdrawProps) {
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [walletAddress, setWalletAddress] = useState('');
  const [network, setNetwork] = useState<'TON' | 'SOL'>('TON');
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');

  const fetchWithdrawals = useCallback(async () => {
    try {
      const response = await fetch(`/api/withdrawals/request?userId=${userId}`);
      const data = await response.json();
      if (data.success) {
        setWithdrawals(data.withdrawals || []);
      }
    } catch (error) {
      console.error('Failed to fetch withdrawals:', error);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    let mounted = true;
    const loadData = async () => {
      if (mounted) {
        await fetchWithdrawals();
      }
    };
    loadData();
    return () => {
      mounted = false;
    };
  }, [fetchWithdrawals]);

  const validateAddress = (address: string, net: 'TON' | 'SOL') => {
    if (net === 'TON') {
      return address.startsWith('UQ') || address.startsWith('EQ') || address.length >= 48;
    }
    if (net === 'SOL') {
      return address.length >= 32 && address.length <= 44;
    }
    return false;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const amountNum = parseFloat(amount);

    if (!walletAddress) {
      setError('Please enter wallet address');
      return;
    }

    if (!validateAddress(walletAddress, network)) {
      setError(`Invalid ${network} wallet address`);
      return;
    }

    if (!amount || amountNum < 1) {
      setError('Minimum withdrawal is 1 USDT');
      return;
    }

    if (amountNum > userUsdt) {
      setError('Insufficient balance');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/withdrawals/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          walletAddress,
          network,
          amount: amountNum
        })
      });

      const data = await response.json();

      if (data.success) {
        setAmount('');
        setWalletAddress('');
        await fetchWithdrawals();
        if (onWithdrawalComplete) {
          onWithdrawalComplete();
        }
      } else {
        setError(data.error || 'Withdrawal failed');
      }
    } catch {
      setError('Failed to submit withdrawal');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      pending: 'text-yellow-400',
      approved: 'text-blue-400',
      completed: 'text-green-400',
      rejected: 'text-red-400',
      cancelled: 'text-gray-400'
    };
    return colors[status] || 'text-gray-400';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="text-white">Loading withdrawal data...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
      >
        ← Back to Wallet
      </button>

      {/* Withdrawal Form */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl p-6 border"
        style={{ backgroundColor: '#151D2B', borderColor: 'rgba(102, 126, 234, 0.3)' }}
      >
        <h2 className="text-xl font-bold text-white mb-6">Withdraw USDT</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Network Selection */}
          <div>
            <label className="text-sm text-gray-400 mb-2 block">Network</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setNetwork('TON')}
                className={`py-3 rounded-xl font-medium transition-all ${
                  network === 'TON' ? 'text-white' : 'text-gray-400'
                }`}
                style={{
                  backgroundColor: network === 'TON' ? '#151D2B' : 'rgba(255,255,255,0.05)',
                  border: network === 'TON' ? '1px solid rgba(102, 126, 234, 0.5)' : '1px solid transparent'
                }}
              >
                💎 TON
              </button>
              <button
                type="button"
                onClick={() => setNetwork('SOL')}
                className={`py-3 rounded-xl font-medium transition-all ${
                  network === 'SOL' ? 'text-white' : 'text-gray-400'
                }`}
                style={{
                  backgroundColor: network === 'SOL' ? '#151D2B' : 'rgba(255,255,255,0.05)',
                  border: network === 'SOL' ? '1px solid rgba(102, 126, 234, 0.5)' : '1px solid transparent'
                }}
              >
                🪙 Solana
              </button>
            </div>
          </div>

          {/* Wallet Address */}
          <div>
            <label className="text-sm text-gray-400 mb-2 block">Wallet Address</label>
            <input
              type="text"
              value={walletAddress}
              onChange={(e) => setWalletAddress(e.target.value)}
              placeholder={`Enter your ${network} wallet address`}
              className="w-full px-4 py-3 rounded-xl text-white"
              style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
            />
          </div>

          {/* Amount */}
          <div>
            <label className="text-sm text-gray-400 mb-2 block">Amount (USDT)</label>
            <div className="relative">
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Enter amount"
                min="1"
                step="0.01"
                className="w-full px-4 py-3 rounded-xl text-white pr-20"
                style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 text-green-400 text-sm">
                Max: {userUsdt.toFixed(2)}
              </div>
            </div>
            <div className="text-xs text-gray-500 mt-1">Minimum: 1 USDT</div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 rounded-xl text-red-400 text-sm" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)' }}>
              {error}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-4 rounded-xl font-medium text-white transition-all hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
            style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)'
            }}
          >
            {isSubmitting ? 'Processing...' : 'Submit Withdrawal'}
          </button>
        </form>
      </motion.div>

      {/* Withdrawal History */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-2xl p-6 border"
        style={{ backgroundColor: '#151D2B', borderColor: 'rgba(255,255,255,0.1)' }}
      >
        <h2 className="text-xl font-bold text-white mb-4">Withdrawal History</h2>

        {withdrawals.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-gray-500 text-lg">No withdrawals yet</div>
            <div className="text-gray-600 text-sm mt-2">Your withdrawal history will appear here</div>
          </div>
        ) : (
          <div className="space-y-3">
            {withdrawals.map((withdrawal, index) => (
              <motion.div
                key={withdrawal.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="rounded-xl p-4 border"
                style={{ backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)' }}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="text-white font-medium">
                    {withdrawal.amount.toFixed(2)} USDT
                  </div>
                  <div className={`text-sm font-medium capitalize ${getStatusColor(withdrawal.status)}`}>
                    {withdrawal.status}
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <div className="text-gray-400">
                    {withdrawal.network} • {withdrawal.wallet_address.slice(0, 6)}...{withdrawal.wallet_address.slice(-4)}
                  </div>
                  <div className="text-gray-500">{formatDate(withdrawal.created_at)}</div>
                </div>
                {withdrawal.fee > 0 && (
                  <div className="text-xs text-gray-500 mt-1">
                    Fee: {withdrawal.fee.toFixed(2)} USDT
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
