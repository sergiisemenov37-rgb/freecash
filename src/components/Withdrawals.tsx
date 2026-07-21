'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';

interface WithdrawalRequest {
  id: string;
  wallet_address: string;
  network: string;
  amount: number;
  fee: number;
  net_amount: number;
  status: string;
  created_at: string;
  processed_at?: string;
}

interface WithdrawalsProps {
  userId: string;
  userUsdt: number;
  onWithdrawalComplete?: () => void;
}

export default function Withdrawals({ userId, userUsdt, onWithdrawalComplete }: WithdrawalsProps) {
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [network, setNetwork] = useState<'TON' | 'SOLANA'>('TON');
  const [walletAddress, setWalletAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const fetchWithdrawals = useCallback(async () => {
    try {
      const response = await fetch(`/api/withdrawals/request?userId=${userId}`);
      const data = await response.json();
      if (data.success) {
        setWithdrawals(data.withdrawals);
      }
    } catch (error) {
      console.error('Failed to fetch withdrawals:', error);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    let mounted = true;
    const loadWithdrawals = async () => {
      if (mounted) {
        await fetchWithdrawals();
      }
    };
    loadWithdrawals();
    return () => {
      mounted = false;
    };
  }, [fetchWithdrawals]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!walletAddress.trim()) {
      setError('Please enter a wallet address');
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    const withdrawalAmount = parseFloat(amount);
    if (withdrawalAmount > userUsdt) {
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
          walletAddress: walletAddress.trim(),
          network,
          amount: withdrawalAmount
        })
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('Withdrawal request submitted successfully!');
        setWalletAddress('');
        setAmount('');
        fetchWithdrawals();
        if (onWithdrawalComplete) {
          onWithdrawalComplete();
        }
      } else {
        setError(data.error || 'Failed to submit withdrawal request');
      }
    } catch (error) {
      console.error('Withdrawal error:', error);
      setError('Failed to submit withdrawal request');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-blue-100 text-blue-800',
      rejected: 'bg-red-100 text-red-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-gray-100 text-gray-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading withdrawal data...</div>;
  }

  return (
    <div className="bg-white rounded-2xl p-6 shadow-2xl">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Withdrawals</h2>
      
      {/* Balance Display */}
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 mb-6">
        <div className="text-sm text-gray-600 mb-1">Available USDT Balance</div>
        <div className="text-3xl font-bold text-green-600">{userUsdt.toFixed(2)} USDT</div>
      </div>

      {/* Withdrawal Form */}
      <form onSubmit={handleSubmit} className="space-y-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Network</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setNetwork('TON')}
              className={`flex-1 py-3 px-4 rounded-xl font-medium transition-colors ${
                network === 'TON'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              TON
            </button>
            <button
              type="button"
              onClick={() => setNetwork('SOLANA')}
              className={`flex-1 py-3 px-4 rounded-xl font-medium transition-colors ${
                network === 'SOLANA'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Solana
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {network} Wallet Address
          </label>
          <input
            type="text"
            value={walletAddress}
            onChange={(e) => setWalletAddress(e.target.value)}
            placeholder={`Enter your ${network} wallet address`}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Amount (USDT)</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Enter amount to withdraw"
            min="1"
            step="0.01"
            max={userUsdt}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
          <div className="text-sm text-gray-500 mt-1">
            Available: {userUsdt.toFixed(2)} USDT
          </div>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl"
          >
            {error}
          </motion.div>
        )}

        {success && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl"
          >
            {success}
          </motion.div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium rounded-xl hover:from-blue-700 hover:to-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Submitting...' : 'Submit Withdrawal Request'}
        </button>
      </form>

      {/* Withdrawal History */}
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Withdrawal History</h3>
        {withdrawals.length === 0 ? (
          <div className="text-center py-8 text-gray-500">No withdrawal requests yet</div>
        ) : (
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {withdrawals.map((withdrawal) => (
              <motion.div
                key={withdrawal.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-gray-50 rounded-xl p-4"
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="font-medium text-gray-800">{withdrawal.network}</div>
                    <div className="text-sm text-gray-500">
                      {withdrawal.wallet_address.substring(0, 8)}...{withdrawal.wallet_address.substring(-8)}
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(withdrawal.status)}`}>
                    {withdrawal.status.charAt(0).toUpperCase() + withdrawal.status.slice(1)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <div>
                    <span className="text-gray-600">Amount: </span>
                    <span className="font-medium">{withdrawal.amount.toFixed(2)} USDT</span>
                  </div>
                  <div className="text-gray-500">{formatDate(withdrawal.created_at)}</div>
                </div>
                {withdrawal.fee > 0 && (
                  <div className="text-sm text-gray-500 mt-1">
                    Fee: {withdrawal.fee.toFixed(2)} USDT | Net: {withdrawal.net_amount.toFixed(2)} USDT
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
