'use client';

import { useState } from 'react';
import { Check, X, Package, Truck, Mail, AlertCircle, Download } from 'lucide-react';

type Pool = {
  id: string;
  status: string;
  pledgedQty: number;
  targetQty: number;
  deadlineAt: string | null;
  product: {
    title: string;
    unitPrice: number;
  };
  _count: {
    items: number;
  };
};

type Props = {
  pools: Pool[];
};

export default function AdminPoolsClient({ pools }: Props) {
  const [selectedPools, setSelectedPools] = useState<Set<string>>(new Set());
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const togglePool = (poolId: string) => {
    const newSelected = new Set(selectedPools);
    if (newSelected.has(poolId)) {
      newSelected.delete(poolId);
    } else {
      newSelected.add(poolId);
    }
    setSelectedPools(newSelected);
  };

  const toggleAll = () => {
    if (selectedPools.size === pools.length) {
      setSelectedPools(new Set());
    } else {
      setSelectedPools(new Set(pools.map(p => p.id)));
    }
  };

  const bulkAction = async (action: string, data?: any) => {
    if (selectedPools.size === 0) {
      setMessage({ type: 'error', text: 'No pools selected' });
      return;
    }

    setProcessing(true);
    setMessage(null);

    try {
      const res = await fetch('/api/admin/pools/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          poolIds: Array.from(selectedPools),
          ...data,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Action failed');
      }

      const result = await res.json();
      setMessage({ type: 'success', text: result.message || 'Action completed successfully' });
      
      // Refresh page after successful action
      setTimeout(() => window.location.reload(), 2000);
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to perform action' });
    } finally {
      setProcessing(false);
    }
  };

  const markMOQReached = () => {
    if (confirm(`Mark ${selectedPools.size} pool(s) as MOQ reached? This will notify all participants.`)) {
      bulkAction('mark_moq_reached');
    }
  };

  const placeOrders = () => {
    if (confirm(`Place orders for ${selectedPools.size} pool(s)? This will update all participant statuses.`)) {
      bulkAction('place_orders');
    }
  };

  const updateShipping = () => {
    const carrier = prompt('Enter carrier name (e.g., DHL, FedEx):');
    if (!carrier) return;

    const tracking = prompt('Enter tracking number(s) (comma-separated for multiple):');
    if (!tracking) return;

    bulkAction('update_shipping', { carrier, tracking });
  };

  const sendNotification = () => {
    const title = prompt('Enter notification title:');
    if (!title) return;

    const body = prompt('Enter notification message:');
    if (!body) return;

    bulkAction('send_notification', { title, body });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OPEN': return 'bg-green-100 text-green-700';
      case 'LOCKED': return 'bg-blue-100 text-blue-700';
      case 'ACTIVE': return 'bg-purple-100 text-purple-700';
      case 'FULFILLING': return 'bg-yellow-100 text-yellow-700';
      case 'FULFILLED': return 'bg-gray-100 text-gray-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getProgress = (pool: Pool) => {
    return Math.min(100, Math.floor((pool.pledgedQty / pool.targetQty) * 100));
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Pool Management</h1>
          <p className="text-gray-600 mt-1">Manage all pools and perform bulk operations</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">
            {selectedPools.size} pool{selectedPools.size !== 1 ? 's' : ''} selected
          </span>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {selectedPools.size > 0 && (
        <div className="bg-gradient-to-r from-orange-50 to-amber-50 border-2 border-orange-200 rounded-xl p-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-orange-600" />
              <span className="font-semibold text-gray-900">Bulk Actions</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={markMOQReached}
                disabled={processing}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                Mark MOQ Reached
              </button>
              <button
                onClick={placeOrders}
                disabled={processing}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                <Package className="w-4 h-4" />
                Place Orders
              </button>
              <button
                onClick={updateShipping}
                disabled={processing}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                <Truck className="w-4 h-4" />
                Update Shipping
              </button>
              <button
                onClick={sendNotification}
                disabled={processing}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                <Mail className="w-4 h-4" />
                Send Notification
              </button>
              <button
                onClick={() => bulkAction('export_csv')}
                disabled={processing}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Message Display */}
      {message && (
        <div className={`p-4 rounded-lg ${
          message.type === 'success' ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-red-50 border border-red-200 text-red-800'
        }`}>
          {message.text}
        </div>
      )}

      {/* Pools Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="p-4 text-left">
                <input
                  type="checkbox"
                  checked={selectedPools.size === pools.length && pools.length > 0}
                  onChange={toggleAll}
                  className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500"
                />
              </th>
              <th className="p-4 text-left text-sm font-semibold text-gray-900">Product</th>
              <th className="p-4 text-left text-sm font-semibold text-gray-900">Status</th>
              <th className="p-4 text-left text-sm font-semibold text-gray-900">Progress</th>
              <th className="p-4 text-left text-sm font-semibold text-gray-900">Participants</th>
              <th className="p-4 text-left text-sm font-semibold text-gray-900">Deadline</th>
              <th className="p-4 text-left text-sm font-semibold text-gray-900">Actions</th>
            </tr>
          </thead>
          <tbody>
            {pools.map((pool) => {
              const progress = getProgress(pool);
              return (
                <tr key={pool.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="p-4">
                    <input
                      type="checkbox"
                      checked={selectedPools.has(pool.id)}
                      onChange={() => togglePool(pool.id)}
                      className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500"
                    />
                  </td>
                  <td className="p-4">
                    <div className="font-medium text-gray-900">{pool.product.title}</div>
                    <div className="text-sm text-gray-500">${pool.product.unitPrice.toFixed(2)} per unit</div>
                  </td>
                  <td className="p-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(pool.status)}`}>
                      {pool.status}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="w-32">
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="font-medium text-gray-900">{pool.pledgedQty}/{pool.targetQty}</span>
                        <span className="text-gray-500">{progress}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-orange-500 to-amber-500 h-2 rounded-full transition-all"
                          style={{ width: `${progress}%` }}
                        ></div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className="text-gray-900 font-medium">{pool._count.items}</span>
                  </td>
                  <td className="p-4">
                    <span className="text-sm text-gray-600">
                      {pool.deadlineAt ? new Date(pool.deadlineAt).toLocaleDateString() : 'No deadline'}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex gap-2">
                      <a
                        href={`/admin/pools/${pool.id}`}
                        className="px-3 py-1.5 text-sm text-orange-600 hover:text-orange-700 font-medium"
                      >
                        View
                      </a>
                      <a
                        href={`/api/admin/pools/${pool.id}/export`}
                        className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-700 font-medium"
                      >
                        Export
                      </a>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {pools.length === 0 && (
          <div className="p-12 text-center text-gray-500">
            <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No pools found</p>
          </div>
        )}
      </div>
    </div>
  );
}
