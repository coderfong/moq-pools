"use client";
import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

type PoolItemStatus = 
  | 'JOINING'
  | 'POOL_ACTIVE'
  | 'MOQ_REACHED'
  | 'PAYMENT_PENDING'
  | 'PAYMENT_CONFIRMED'
  | 'ORDER_PLACED'
  | 'PREPARING_SHIPMENT'
  | 'IN_TRANSIT'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'REFUNDED';

interface PoolItem {
  id: string;
  quantity: number;
  unitPrice: number;
  currency: string;
  createdAt: Date;
  poolItemStatus: PoolItemStatus;
  pool: {
    id: string;
    status: string;
    targetQty: number;
    pledgedQty: number;
    deadlineAt: Date;
    moqReachedAt: Date | null;
    product: {
      id: string;
      title: string;
      imagesJson: string | null;
    };
  };
  payment?: {
    status: string;
    amount: number;
    paidAt: Date | null;
  } | null;
  shipment?: {
    carrier: string | null;
    trackingNo: string | null;
    status: string;
    etaDate: Date | null;
    createdAt: Date;
    updatedAt: Date;
  } | null;
  statusHistory?: Array<{
    id: string;
    fromStatus: PoolItemStatus | null;
    toStatus: PoolItemStatus;
    notes: string | null;
    createdAt: Date;
    automated: boolean;
    triggeredBy: {
      name: string | null;
      email: string;
    } | null;
  }>;
}

interface OrderTrackingClientProps {
  poolItems: PoolItem[];
}

const STATUS_CONFIG: Record<PoolItemStatus, {
  label: string;
  icon: string;
  color: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
  progress: number;
}> = {
  JOINING: { label: 'Joining Pool', icon: '👋', color: 'blue', bgColor: 'bg-blue-50', borderColor: 'border-blue-200', textColor: 'text-blue-700', progress: 10 },
  POOL_ACTIVE: { label: 'Pool Active', icon: '👥', color: 'blue', bgColor: 'bg-blue-50', borderColor: 'border-blue-200', textColor: 'text-blue-700', progress: 25 },
  MOQ_REACHED: { label: 'MOQ Reached', icon: '🎯', color: 'green', bgColor: 'bg-green-50', borderColor: 'border-green-200', textColor: 'text-green-700', progress: 35 },
  PAYMENT_PENDING: { label: 'Payment Pending', icon: '⏳', color: 'amber', bgColor: 'bg-amber-50', borderColor: 'border-amber-200', textColor: 'text-amber-700', progress: 40 },
  PAYMENT_CONFIRMED: { label: 'Payment Confirmed', icon: '✅', color: 'green', bgColor: 'bg-green-50', borderColor: 'border-green-200', textColor: 'text-green-700', progress: 50 },
  ORDER_PLACED: { label: 'Order Placed', icon: '📋', color: 'purple', bgColor: 'bg-purple-50', borderColor: 'border-purple-200', textColor: 'text-purple-700', progress: 60 },
  PREPARING_SHIPMENT: { label: 'Preparing Shipment', icon: '📦', color: 'indigo', bgColor: 'bg-indigo-50', borderColor: 'border-indigo-200', textColor: 'text-indigo-700', progress: 70 },
  IN_TRANSIT: { label: 'In Transit', icon: '🚚', color: 'cyan', bgColor: 'bg-cyan-50', borderColor: 'border-cyan-200', textColor: 'text-cyan-700', progress: 85 },
  OUT_FOR_DELIVERY: { label: 'Out for Delivery', icon: '🏃', color: 'emerald', bgColor: 'bg-emerald-50', borderColor: 'border-emerald-200', textColor: 'text-emerald-700', progress: 95 },
  DELIVERED: { label: 'Delivered', icon: '🎉', color: 'green', bgColor: 'bg-green-50', borderColor: 'border-green-200', textColor: 'text-green-700', progress: 100 },
  CANCELLED: { label: 'Cancelled', icon: '❌', color: 'red', bgColor: 'bg-red-50', borderColor: 'border-red-200', textColor: 'text-red-700', progress: 0 },
  REFUNDED: { label: 'Refunded', icon: '💰', color: 'gray', bgColor: 'bg-gray-50', borderColor: 'border-gray-200', textColor: 'text-gray-700', progress: 0 },
};

const MILESTONE_STATUSES: PoolItemStatus[] = [
  'JOINING',
  'MOQ_REACHED',
  'PAYMENT_CONFIRMED',
  'ORDER_PLACED',
  'IN_TRANSIT',
  'DELIVERED'
];

function parseImages(json: string | null): string[] {
  if (!json) return [];
  try {
    const arr = JSON.parse(json);
    return Array.isArray(arr) ? arr.filter(Boolean) : [];
  } catch {
    return [];
  }
}

function formatDate(date: Date | string | null): string {
  if (!date) return '—';
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  }).format(d);
}

export default function OrderTrackingClient({ poolItems: initialItems }: OrderTrackingClientProps) {
  const [poolItems] = useState<PoolItem[]>(
    initialItems.map(item => ({
      ...item,
      createdAt: new Date(item.createdAt),
      payment: item.payment ? {
        ...item.payment,
        paidAt: item.payment.paidAt ? new Date(item.payment.paidAt) : null
      } : null,
      shipment: item.shipment ? {
        ...item.shipment,
        etaDate: item.shipment.etaDate ? new Date(item.shipment.etaDate) : null,
        createdAt: new Date(item.shipment.createdAt),
        updatedAt: new Date(item.shipment.updatedAt)
      } : null,
      statusHistory: item.statusHistory?.map(h => ({
        ...h,
        createdAt: new Date(h.createdAt)
      }))
    }))
  );

  const [filterStatus, setFilterStatus] = useState<'all' | PoolItemStatus>('all');
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  // Filter pool items
  const filteredItems = useMemo(() => {
    if (filterStatus === 'all') return poolItems;
    return poolItems.filter(item => item.poolItemStatus === filterStatus);
  }, [poolItems, filterStatus]);

  // Get status counts
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: poolItems.length };
    poolItems.forEach(item => {
      counts[item.poolItemStatus] = (counts[item.poolItemStatus] || 0) + 1;
    });
    return counts;
  }, [poolItems]);

  const selectedItemData = selectedItem 
    ? poolItems.find(item => item.id === selectedItem) 
    : null;

  if (poolItems.length === 0) {
    return (
      <div className="p-8 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
          <span className="text-3xl">📦</span>
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">No Orders Yet</h2>
        <p className="text-gray-600 mb-6">
          Join a pool to start tracking your orders from pool formation to delivery.
        </p>
        <Link 
          href="/pools"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-semibold hover:shadow-lg transition-all"
        >
          Browse Products →
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Status Filters */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilterStatus('all')}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
            filterStatus === 'all'
              ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-md'
              : 'bg-white border-2 border-gray-200 text-gray-700 hover:border-emerald-300'
          }`}
        >
          All Orders ({statusCounts.all})
        </button>
        {Object.entries(STATUS_CONFIG).map(([status, config]) => {
          const count = statusCounts[status] || 0;
          if (count === 0) return null;
          return (
            <button
              key={status}
              onClick={() => setFilterStatus(status as PoolItemStatus)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 ${
                filterStatus === status
                  ? `bg-gradient-to-r from-${config.color}-500 to-${config.color}-600 text-white shadow-md`
                  : `bg-white border-2 ${config.borderColor} ${config.textColor} hover:${config.bgColor}`
              }`}
            >
              <span>{config.icon}</span>
              <span>{config.label}</span>
              <span className={`px-2 py-0.5 rounded-full text-xs ${
                filterStatus === status ? 'bg-white/20' : config.bgColor
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Order List */}
      <div className="grid grid-cols-1 gap-4">
        <AnimatePresence mode="popLayout">
          {filteredItems.map((item) => {
            const config = STATUS_CONFIG[item.poolItemStatus];
            const images = parseImages(item.pool.product.imagesJson);
            const productImage = images[0] || '/placeholder-product.png';

            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={`rounded-2xl border-2 ${config.borderColor} bg-white overflow-hidden hover:shadow-lg transition-all cursor-pointer`}
                onClick={() => {
                  setSelectedItem(item.id);
                  setShowHistory(true);
                }}
              >
                <div className="p-6">
                  <div className="flex items-start gap-4">
                    {/* Product Image */}
                    <div className="flex-shrink-0">
                      <img
                        src={productImage}
                        alt={item.pool.product.title}
                        className="w-24 h-24 rounded-xl object-cover border-2 border-gray-200"
                      />
                    </div>

                    {/* Order Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2">
                        {item.pool.product.title}
                      </h3>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mb-3">
                        <span>Qty: {item.quantity}</span>
                        <span>•</span>
                        <span>${(Number(item.unitPrice) * item.quantity).toFixed(2)} {item.currency}</span>
                        <span>•</span>
                        <span>Ordered: {formatDate(item.createdAt)}</span>
                      </div>

                      {/* Status Badge */}
                      <div className="flex items-center gap-3 mb-4">
                        <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold ${config.bgColor} ${config.textColor} border-2 ${config.borderColor}`}>
                          <span>{config.icon}</span>
                          <span>{config.label}</span>
                        </span>
                        {item.shipment?.trackingNo && (
                          <span className="text-xs text-gray-500">
                            Tracking: {item.shipment.trackingNo}
                          </span>
                        )}
                      </div>

                      {/* Progress Bar */}
                      <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${config.progress}%` }}
                          transition={{ duration: 0.8, ease: 'easeOut' }}
                          className={`absolute top-0 left-0 h-full bg-gradient-to-r from-${config.color}-400 to-${config.color}-600`}
                        />
                      </div>
                      <div className="mt-1 text-xs text-gray-500 text-right">
                        {config.progress}% Complete
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Order Detail Modal */}
      <AnimatePresence>
        {showHistory && selectedItemData && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowHistory(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="p-6 border-b-2 border-gray-200 bg-gradient-to-r from-emerald-50 to-white">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">
                      Order Timeline
                    </h2>
                    <p className="text-sm text-gray-600">
                      {selectedItemData.pool.product.title}
                    </p>
                  </div>
                  <button
                    onClick={() => setShowHistory(false)}
                    className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
                  >
                    <span className="text-2xl">×</span>
                  </button>
                </div>
              </div>

              {/* Timeline */}
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
                {/* Milestone Progress */}
                <div className="mb-8">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Progress</h3>
                  <div className="flex items-center justify-between relative">
                    {/* Progress Line */}
                    <div className="absolute top-5 left-0 right-0 h-1 bg-gray-200 -z-10" />
                    <motion.div 
                      className="absolute top-5 left-0 h-1 bg-gradient-to-r from-emerald-400 to-emerald-600 -z-10"
                      initial={{ width: 0 }}
                      animate={{ 
                        width: `${(MILESTONE_STATUSES.indexOf(selectedItemData.poolItemStatus) / (MILESTONE_STATUSES.length - 1)) * 100}%` 
                      }}
                      transition={{ duration: 0.8 }}
                    />

                    {/* Milestones */}
                    {MILESTONE_STATUSES.map((status) => {
                      const config = STATUS_CONFIG[status];
                      const currentIndex = MILESTONE_STATUSES.indexOf(selectedItemData.poolItemStatus);
                      const statusIndex = MILESTONE_STATUSES.indexOf(status);
                      const isCompleted = statusIndex <= currentIndex;
                      const isCurrent = status === selectedItemData.poolItemStatus;

                      return (
                        <div key={status} className="flex flex-col items-center gap-2">
                          <div 
                            className={`w-10 h-10 rounded-full flex items-center justify-center text-xl border-4 transition-all ${
                              isCompleted
                                ? `${config.bgColor} ${config.borderColor} ${isCurrent ? 'ring-4 ring-emerald-200 scale-110' : ''}`
                                : 'bg-white border-gray-300'
                            }`}
                          >
                            {config.icon}
                          </div>
                          <span className={`text-xs font-semibold text-center max-w-[80px] ${
                            isCompleted ? config.textColor : 'text-gray-400'
                          }`}>
                            {config.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Status History */}
                {selectedItemData.statusHistory && selectedItemData.statusHistory.length > 0 && (
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-4">History</h3>
                    <div className="space-y-3">
                      {selectedItemData.statusHistory.map((history, index) => {
                        const toConfig = STATUS_CONFIG[history.toStatus];
                        const fromConfig = history.fromStatus ? STATUS_CONFIG[history.fromStatus] : null;

                        return (
                          <div 
                            key={history.id}
                            className={`p-4 rounded-xl border-2 ${toConfig.borderColor} ${toConfig.bgColor}`}
                          >
                            <div className="flex items-start gap-3">
                              <span className="text-2xl">{toConfig.icon}</span>
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  {fromConfig && (
                                    <span className="text-sm text-gray-500">
                                      {fromConfig.icon} {fromConfig.label} →
                                    </span>
                                  )}
                                  <span className={`text-sm font-semibold ${toConfig.textColor}`}>
                                    {toConfig.icon} {toConfig.label}
                                  </span>
                                </div>
                                <div className="text-xs text-gray-600">
                                  {formatDate(history.createdAt)}
                                  {history.automated ? ' (Automated)' : ' (Manual)'}
                                  {history.triggeredBy && ` by ${history.triggeredBy.name || history.triggeredBy.email}`}
                                </div>
                                {history.notes && (
                                  <div className="mt-2 text-sm text-gray-700 bg-white/50 p-2 rounded">
                                    {history.notes}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Additional Info */}
                <div className="mt-6 grid grid-cols-2 gap-4">
                  {selectedItemData.payment && (
                    <div className="p-4 rounded-xl bg-green-50 border-2 border-green-200">
                      <div className="text-sm font-semibold text-green-700 mb-1">Payment</div>
                      <div className="text-lg font-bold text-green-900">
                        ${Number(selectedItemData.payment.amount).toFixed(2)}
                      </div>
                      <div className="text-xs text-green-600">
                        {selectedItemData.payment.status}
                        {selectedItemData.payment.paidAt && ` • ${formatDate(selectedItemData.payment.paidAt)}`}
                      </div>
                    </div>
                  )}
                  {selectedItemData.shipment && (
                    <div className="p-4 rounded-xl bg-blue-50 border-2 border-blue-200">
                      <div className="text-sm font-semibold text-blue-700 mb-1">Shipping</div>
                      <div className="text-sm font-bold text-blue-900">
                        {selectedItemData.shipment.carrier || 'Carrier TBD'}
                      </div>
                      {selectedItemData.shipment.trackingNo && (
                        <div className="text-xs text-blue-600 font-mono">
                          {selectedItemData.shipment.trackingNo}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
