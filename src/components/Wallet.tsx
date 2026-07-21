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
}

export default function Wallet({ userId, userCoins, userUsdt }: WalletProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [balances, setBalances] = useState<{ coins: number; usdt: number } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filterType, setFilterType] = useState<string>('');
  const [filterCurrency, setFilterCurrency] = useState<string>('');

  const fetchTransactions = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        userId,
        page: page.toString(),
        limit: '20'
      });
      
      if (filterType) params.append('type', filterType);
      if (filterCurrency) params.append('currency', filterCurrency);

      const response = await fetch(`/api/wallet/transactions?${params}`);
      const data = await response.json();
      if (data.success) {
        setTransactions(data.transactions);
        setBalances(data.balances);
        setTotalPages(data.pagination.totalPages);
      }
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
    } finally {
      setIsLoading(false);
    }
  }, [userId, page, filterType, filterCurrency]);

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
      tap_reward: '👆',
      mission_reward: '🎯',
      daily_reward: '🎁',
      referral_reward: '👥',
      withdrawal: '💸',
      admin_adjustment: '⚙️',
      conversion: '🔄',
      boost_purchase: '⚡'
    };
    return icons[type] || '💰';
  };

  const getTransactionColor = (type: string) => {
    const colors: { [key: string]: string } = {
      tap_reward: 'text-green-600',
      mission_reward: 'text-blue-600',
      daily_reward: 'text-purple-600',
      referral_reward: 'text-pink-600',
      withdrawal: 'text-red-600',
      admin_adjustment: 'text-gray-600',
      conversion: 'text-orange-600',
      boost_purchase: 'text-yellow-600'
    };
    return colors[type] || 'text-gray-600';
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
    return <div className="text-center py-8">Loading wallet data...</div>;
  }

  return (
    <div className="bg-white rounded-2xl p-6 shadow-2xl">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Wallet</h2>
      
      {/* Balance Cards */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-yellow-50 to-amber-50 rounded-xl p-4"
        >
          <div className="text-sm text-gray-600 mb-1">Coins Balance</div>
          <div className="text-2xl font-bold text-yellow-600">
            {balances?.coins?.toFixed(2) || userCoins.toFixed(2)}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4"
        >
          <div className="text-sm text-gray-600 mb-1">USDT Balance</div>
          <div className="text-2xl font-bold text-green-600">
            {balances?.usdt?.toFixed(2) || userUsdt.toFixed(2)}
          </div>
        </motion.div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <select
          value={filterType}
          onChange={(e) => { setFilterType(e.target.value); setPage(1); }}
          className="px-3 py-2 border rounded-lg text-sm"
        >
          <option value="">All Types</option>
          <option value="tap_reward">Tap Reward</option>
          <option value="mission_reward">Mission Reward</option>
          <option value="daily_reward">Daily Reward</option>
          <option value="referral_reward">Referral Reward</option>
          <option value="withdrawal">Withdrawal</option>
          <option value="boost_purchase">Boost Purchase</option>
        </select>

        <select
          value={filterCurrency}
          onChange={(e) => { setFilterCurrency(e.target.value); setPage(1); }}
          className="px-3 py-2 border rounded-lg text-sm"
        >
          <option value="">All Currencies</option>
          <option value="COINS">Coins</option>
          <option value="USDT">USDT</option>
        </select>
      </div>

      {/* Transaction List */}
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {transactions.length === 0 ? (
          <div className="text-center py-8 text-gray-500">No transactions found</div>
        ) : (
          transactions.map((transaction, index) => (
            <motion.div
              key={transaction.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-gray-50 rounded-xl p-4 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{getTransactionIcon(transaction.type)}</span>
                <div>
                  <div className="font-medium text-gray-800">{transaction.description}</div>
                  <div className="text-sm text-gray-500">{formatDate(transaction.created_at)}</div>
                </div>
              </div>
              <div className={`text-right ${getTransactionColor(transaction.type)}`}>
                <div className="font-bold">
                  {transaction.type === 'withdrawal' || transaction.type === 'boost_purchase' ? '-' : '+'}
                  {transaction.amount.toFixed(2)} {transaction.currency}
                </div>
                <div className="text-xs text-gray-500 capitalize">{transaction.status}</div>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          <button
            onClick={() => handlePageChange(page - 1)}
            disabled={page === 1}
            className="px-4 py-2 bg-gray-200 rounded-lg disabled:opacity-50 hover:bg-gray-300 transition-colors"
          >
            Previous
          </button>
          <span className="px-4 py-2 text-gray-600">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => handlePageChange(page + 1)}
            disabled={page === totalPages}
            className="px-4 py-2 bg-gray-200 rounded-lg disabled:opacity-50 hover:bg-gray-300 transition-colors"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
