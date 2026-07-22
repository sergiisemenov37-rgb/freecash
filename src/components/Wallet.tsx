'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';

interface Transaction {
  id: string;
  type: string;
  amount: number;
  currency: string;
  status: string;
  description: string;
  created_at: string;
}

interface WalletProps {
  userId: string;
  userCoins: number;
  userUsdt: number;
  onWithdraw?: () => void;
}

// Financial transaction types only - no tap rewards
const FINANCIAL_TRANSACTION_TYPES = ['referral_reward', 'withdrawal', 'deposit', 'cpa_reward', 'admin_adjustment'];

export default function Wallet({ userId, onWithdraw }: WalletProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filterType, setFilterType] = useState<string>('');

  const fetchTransactions = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        userId,
        page: page.toString(),
        limit: '20'
      });
      
      if (filterType) params.append('type', filterType);

      const response = await fetch(`/api/wallet/transactions?${params}`);
      const data = await response.json();
      if (data.success) {
        // Filter out tap rewards - only show financial history
        const financialTransactions = data.transactions.filter(
          (t: Transaction) => FINANCIAL_TRANSACTION_TYPES.includes(t.type)
        );
        setTransactions(financialTransactions);
        setTotalPages(data.pagination.totalPages);
      }
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
    } finally {
      setIsLoading(false);
    }
  }, [userId, page, filterType]);

  useEffect(() => {
    let mounted = true;
    const loadTransactions = async () => {
      if (mounted) {
        await fetchTransactions();
      }
    };
    loadTransactions();
    return () => {
      mounted = false;
    };
  }, [fetchTransactions]);

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const getTransactionIcon = (type: string) => {
    const icons: { [key: string]: string } = {
      referral_reward: '👥',
      withdrawal: '💸',
      deposit: '📥',
      cpa_reward: '🎯',
      admin_adjustment: '⚙️'
    };
    return icons[type] || '💰';
  };

  const getTransactionColor = (type: string) => {
    const colors: { [key: string]: string } = {
      referral_reward: 'text-pink-400',
      withdrawal: 'text-red-400',
      deposit: 'text-green-400',
      cpa_reward: 'text-blue-400',
      admin_adjustment: 'text-gray-400'
    };
    return colors[type] || 'text-gray-400';
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
        <div className="text-white">Loading wallet data...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={onWithdraw}
          className="py-4 rounded-xl font-medium text-white transition-all hover:scale-105"
          style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)'
          }}
        >
          💸 Withdraw
        </button>
        <button
          onClick={() => setPage(1)}
          className="py-4 rounded-xl font-medium text-white transition-all hover:scale-105"
          style={{
            background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
            boxShadow: '0 4px 15px rgba(34, 197, 94, 0.4)'
          }}
        >
          📊 History
        </button>
      </div>

      {/* Filter */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {[
          { id: '', label: 'All' },
          { id: 'referral_reward', label: 'Referrals' },
          { id: 'withdrawal', label: 'Withdrawals' },
          { id: 'cpa_reward', label: 'CPA Rewards' }
        ].map((filter) => (
          <button
            key={filter.id}
            onClick={() => { setFilterType(filter.id); setPage(1); }}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
              filterType === filter.id
                ? 'text-white'
                : 'text-gray-400 hover:text-white'
            }`}
            style={{
              backgroundColor: filterType === filter.id ? '#151D2B' : 'transparent',
              border: filterType === filter.id ? '1px solid rgba(255,255,255,0.1)' : '1px solid transparent'
            }}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {/* Transaction List */}
      <div className="space-y-3">
        {transactions.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-500 text-lg">No financial transactions</div>
            <div className="text-gray-600 text-sm mt-2">Complete tasks to earn rewards</div>
          </div>
        ) : (
          transactions.map((transaction, index) => (
            <motion.div
              key={transaction.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="rounded-2xl p-4 border transition-all hover:scale-[1.02]"
              style={{ backgroundColor: '#151D2B', borderColor: 'rgba(255,255,255,0.1)' }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{getTransactionIcon(transaction.type)}</span>
                  <div>
                    <div className="font-medium text-white">{transaction.description}</div>
                    <div className="text-sm text-gray-400">{formatDate(transaction.created_at)}</div>
                  </div>
                </div>
                <div className={`text-right ${getTransactionColor(transaction.type)}`}>
                  <div className="font-bold">
                    {transaction.type === 'withdrawal' ? '-' : '+'}
                    {transaction.amount.toFixed(2)} {transaction.currency}
                  </div>
                  <div className="text-xs text-gray-500 capitalize">{transaction.status}</div>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <button
            onClick={() => handlePageChange(page - 1)}
            disabled={page === 1}
            className="px-4 py-2 rounded-xl text-white disabled:opacity-50 transition-all"
            style={{ backgroundColor: '#151D2B' }}
          >
            Previous
          </button>
          <span className="px-4 py-2 text-gray-400">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => handlePageChange(page + 1)}
            disabled={page === totalPages}
            className="px-4 py-2 rounded-xl text-white disabled:opacity-50 transition-all"
            style={{ backgroundColor: '#151D2B' }}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
