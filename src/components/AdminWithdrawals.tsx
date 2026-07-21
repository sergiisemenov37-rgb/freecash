'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';

interface WithdrawalRequest {
  id: string;
  user_id: string;
  wallet_address: string;
  network: string;
  amount: number;
  fee: number;
  net_amount: number;
  status: string;
  admin_notes?: string;
  transaction_hash?: string;
  created_at: string;
  processed_at?: string;
  users?: {
    telegram_id: string;
    username?: string;
    first_name?: string;
  };
}

export default function AdminWithdrawals() {
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterNetwork, setFilterNetwork] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<WithdrawalRequest | null>(null);
  const [action, setAction] = useState<'approve' | 'reject' | 'complete' | 'cancel' | null>(null);
  const [transactionHash, setTransactionHash] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchWithdrawals = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '50'
      });
      
      if (filterStatus) params.append('status', filterStatus);
      if (filterNetwork) params.append('network', filterNetwork);

      const response = await fetch(`/api/admin/withdrawals?${params}`, {
        headers: {
          'x-admin-key': process.env.NEXT_PUBLIC_ADMIN_KEY || ''
        }
      });
      const data = await response.json();
      if (data.success) {
        setWithdrawals(data.withdrawals);
        setTotalPages(data.pagination.totalPages);
      }
    } catch (error) {
      console.error('Failed to fetch withdrawals:', error);
    } finally {
      setIsLoading(false);
    }
  }, [page, filterStatus, filterNetwork]);

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

  const handleAction = async () => {
    if (!selectedWithdrawal || !action) return;

    setIsProcessing(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/admin/withdrawals', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': process.env.NEXT_PUBLIC_ADMIN_KEY || ''
        },
        body: JSON.stringify({
          withdrawalId: selectedWithdrawal.id,
          status: action === 'approve' ? 'approved' : action,
          transactionHash: action === 'complete' ? transactionHash : undefined,
          adminNotes: adminNotes || undefined
        })
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(`Withdrawal ${action}d successfully!`);
        setSelectedWithdrawal(null);
        setAction(null);
        setTransactionHash('');
        setAdminNotes('');
        fetchWithdrawals();
      } else {
        setError(data.error || 'Failed to update withdrawal');
      }
    } catch (error) {
      console.error('Action error:', error);
      setError('Failed to update withdrawal');
    } finally {
      setIsProcessing(false);
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
    return <div className="text-center py-8">Loading withdrawal requests...</div>;
  }

  return (
    <div className="bg-white rounded-2xl p-6 shadow-2xl">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Admin Withdrawal Management</h2>
      
      {/* Filters */}
      <div className="flex gap-2 mb-6 flex-wrap">
        <select
          value={filterStatus}
          onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
          className="px-3 py-2 border rounded-lg text-sm"
        >
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>

        <select
          value={filterNetwork}
          onChange={(e) => { setFilterNetwork(e.target.value); setPage(1); }}
          className="px-3 py-2 border rounded-lg text-sm"
        >
          <option value="">All Networks</option>
          <option value="TON">TON</option>
          <option value="SOLANA">Solana</option>
        </select>
      </div>

      {/* Withdrawal List */}
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {withdrawals.length === 0 ? (
          <div className="text-center py-8 text-gray-500">No withdrawal requests found</div>
        ) : (
          withdrawals.map((withdrawal) => (
            <motion.div
              key={withdrawal.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-gray-50 rounded-xl p-4"
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <div className="font-medium text-gray-800">
                    {withdrawal.users?.first_name || 'User'} ({withdrawal.users?.username || withdrawal.users?.telegram_id})
                  </div>
                  <div className="text-sm text-gray-500">
                    {withdrawal.network} - {withdrawal.wallet_address.substring(0, 10)}...
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(withdrawal.status)}`}>
                  {withdrawal.status.charAt(0).toUpperCase() + withdrawal.status.slice(1)}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm mb-2">
                <div>
                  <span className="text-gray-600">Amount: </span>
                  <span className="font-medium">{withdrawal.amount.toFixed(2)} USDT</span>
                </div>
                <div className="text-gray-500">{formatDate(withdrawal.created_at)}</div>
              </div>
              {withdrawal.fee > 0 && (
                <div className="text-sm text-gray-500 mb-2">
                  Fee: {withdrawal.fee.toFixed(2)} USDT | Net: {withdrawal.net_amount.toFixed(2)} USDT
                </div>
              )}
              {withdrawal.transaction_hash && (
                <div className="text-sm text-gray-500 mb-2">
                  TX: {withdrawal.transaction_hash.substring(0, 20)}...
                </div>
              )}
              {withdrawal.admin_notes && (
                <div className="text-sm text-gray-500 mb-2">
                  Note: {withdrawal.admin_notes}
                </div>
              )}
              {withdrawal.status === 'pending' && (
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => { setSelectedWithdrawal(withdrawal); setAction('approve'); }}
                    className="px-3 py-1 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => { setSelectedWithdrawal(withdrawal); setAction('reject'); }}
                    className="px-3 py-1 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition-colors"
                  >
                    Reject
                  </button>
                </div>
              )}
              {withdrawal.status === 'approved' && (
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => { setSelectedWithdrawal(withdrawal); setAction('complete'); }}
                    className="px-3 py-1 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 transition-colors"
                  >
                    Complete
                  </button>
                  <button
                    onClick={() => { setSelectedWithdrawal(withdrawal); setAction('cancel'); }}
                    className="px-3 py-1 bg-gray-600 text-white rounded-lg text-sm hover:bg-gray-700 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </motion.div>
          ))
        )}
      </div>

      {/* Action Modal */}
      {selectedWithdrawal && action && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => { setSelectedWithdrawal(null); setAction(null); }}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl p-6 max-w-md w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold text-gray-800 mb-4">
              {action.charAt(0).toUpperCase() + action.slice(1)} Withdrawal
            </h3>
            <div className="mb-4">
              <p className="text-gray-600">
                Amount: {selectedWithdrawal.amount.toFixed(2)} USDT
              </p>
              <p className="text-gray-600">
                Network: {selectedWithdrawal.network}
              </p>
              <p className="text-gray-600">
                Wallet: {selectedWithdrawal.wallet_address}
              </p>
            </div>
            {action === 'complete' && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Transaction Hash
                </label>
                <input
                  type="text"
                  value={transactionHash}
                  onChange={(e) => setTransactionHash(e.target.value)}
                  placeholder="Enter transaction hash"
                  className="w-full px-4 py-2 border rounded-lg"
                />
              </div>
            )}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Admin Notes (optional)
              </label>
              <textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Add notes..."
                className="w-full px-4 py-2 border rounded-lg"
                rows={3}
              />
            </div>
            {error && (
              <div className="bg-red-50 text-red-700 px-4 py-2 rounded-lg mb-4">
                {error}
              </div>
            )}
            {success && (
              <div className="bg-green-50 text-green-700 px-4 py-2 rounded-lg mb-4">
                {success}
              </div>
            )}
            <div className="flex gap-2">
              <button
                onClick={handleAction}
                disabled={isProcessing}
                className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {isProcessing ? 'Processing...' : 'Confirm'}
              </button>
              <button
                onClick={() => { setSelectedWithdrawal(null); setAction(null); }}
                className="flex-1 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          <button
            onClick={() => setPage(page - 1)}
            disabled={page === 1}
            className="px-4 py-2 bg-gray-200 rounded-lg disabled:opacity-50 hover:bg-gray-300 transition-colors"
          >
            Previous
          </button>
          <span className="px-4 py-2 text-gray-600">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage(page + 1)}
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
