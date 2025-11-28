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
              <div className="p-6 border-b-2 border-gray-200 bg-gradient-to-r from-emerald-50 via-blue-50 to-purple-50">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h2 className="text-2xl font-bold text-gray-900">
                        Order Timeline
                      </h2>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${STATUS_CONFIG[selectedItemData.poolItemStatus].bgColor} ${STATUS_CONFIG[selectedItemData.poolItemStatus].textColor} border-2 ${STATUS_CONFIG[selectedItemData.poolItemStatus].borderColor}`}>
                        {STATUS_CONFIG[selectedItemData.poolItemStatus].icon} {STATUS_CONFIG[selectedItemData.poolItemStatus].label}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">
                      {selectedItemData.pool.product.title}
                    </p>
                    <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <span className="font-semibold">Order ID:</span> {selectedItemData.id.slice(0, 12)}...
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="font-semibold">Joined:</span> {formatDate(selectedItemData.createdAt)}
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="font-semibold">Qty:</span> {selectedItemData.quantity}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowHistory(false)}
                    className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
                  >
                    <span className="text-2xl">✕</span>
                  </button>
                </div>
              </div>

              {/* Timeline */}
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
                {/* Order Summary Cards */}
                <div className="mb-6 grid grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200">
                    <div className="text-xs font-semibold text-blue-600 mb-1">Pool Status</div>
                    <div className="text-lg font-bold text-blue-900 capitalize">{selectedItemData.pool.status.toLowerCase()}</div>
                    <div className="text-xs text-blue-600 mt-1">{selectedItemData.pool.pledgedQty} / {selectedItemData.pool.targetQty} units</div>
                  </div>
                  
                  {selectedItemData.payment && (
                    <div className="p-4 rounded-xl bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-200">
                      <div className="text-xs font-semibold text-green-600 mb-1">Payment</div>
                      <div className="text-lg font-bold text-green-900">${Number(selectedItemData.payment.amount).toFixed(2)}</div>
                      <div className="text-xs text-green-600 mt-1 capitalize">{selectedItemData.payment.status.toLowerCase()}</div>
                    </div>
                  )}
                  
                  {selectedItemData.shipment ? (
                    <div className="p-4 rounded-xl bg-gradient-to-br from-purple-50 to-purple-100 border-2 border-purple-200">
                      <div className="text-xs font-semibold text-purple-600 mb-1">Delivery</div>
                      <div className="text-sm font-bold text-purple-900">
                        {selectedItemData.shipment.etaDate ? formatDate(selectedItemData.shipment.etaDate).split(',')[0] : 'TBD'}
                      </div>
                      <div className="text-xs text-purple-600 mt-1">{selectedItemData.shipment.carrier || 'Carrier pending'}</div>
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-gray-200">
                      <div className="text-xs font-semibold text-gray-600 mb-1">Delivery</div>
                      <div className="text-sm font-bold text-gray-900">Not Yet Shipped</div>
                      <div className="text-xs text-gray-600 mt-1">Awaiting fulfillment</div>
                    </div>
                  )}
                </div>

                {/* Timeline Progress */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-gray-900">Journey Timeline</h3>
                    <span className="text-sm text-gray-500">
                      {Math.round((MILESTONE_STATUSES.indexOf(selectedItemData.poolItemStatus) / (MILESTONE_STATUSES.length - 1)) * 100)}% Complete
                    </span>
                  </div>
                  
                  <div className="relative">
                    {/* Vertical Timeline */}
                    <div className="space-y-6">
                      {MILESTONE_STATUSES.map((status, index) => {
                        const config = STATUS_CONFIG[status];
                        const currentIndex = MILESTONE_STATUSES.indexOf(selectedItemData.poolItemStatus);
                        const statusIndex = MILESTONE_STATUSES.indexOf(status);
                        const isCompleted = statusIndex <= currentIndex;
                        const isCurrent = status === selectedItemData.poolItemStatus;
                        
                        // Find the history entry for this status
                        const historyEntry = selectedItemData.statusHistory?.find(h => h.toStatus === status);
                        
                        // Calculate estimated dates for future milestones
                        let estimatedDate = null;
                        if (!isCompleted) {
                          if (status === 'MOQ_REACHED' && selectedItemData.pool.deadlineAt) {
                            estimatedDate = selectedItemData.pool.deadlineAt;
                          } else if (status === 'DELIVERED' && selectedItemData.shipment?.etaDate) {
                            estimatedDate = selectedItemData.shipment.etaDate;
                          }
                        }

                        return (
                          <div key={status} className="flex gap-4">
                            {/* Timeline Line */}
                            <div className="flex flex-col items-center">
                              <motion.div 
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ delay: index * 0.1 }}
                                className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl border-4 z-10 ${
                                  isCompleted
                                    ? `${config.bgColor} ${config.borderColor} ${isCurrent ? 'ring-4 ring-emerald-200 shadow-lg' : 'shadow-md'}`
                                    : 'bg-white border-gray-300 text-gray-400'
                                }`}
                              >
                                {config.icon}
                              </motion.div>
                              {index < MILESTONE_STATUSES.length - 1 && (
                                <div className={`w-1 flex-1 min-h-[40px] ${isCompleted ? 'bg-emerald-400' : 'bg-gray-200'}`} />
                              )}
                            </div>

                            {/* Content */}
                            <div className={`flex-1 pb-6 ${isCurrent ? 'transform scale-105' : ''}`}>
                              <div className={`p-4 rounded-xl border-2 ${
                                isCompleted 
                                  ? `${config.bgColor} ${config.borderColor}` 
                                  : 'bg-gray-50 border-gray-200'
                              }`}>
                                <div className="flex items-start justify-between gap-2 mb-2">
                                  <div>
                                    <h4 className={`font-bold text-base ${isCompleted ? config.textColor : 'text-gray-500'}`}>
                                      {config.label}
                                    </h4>
                                    {historyEntry && (
                                      <div className="text-xs text-gray-600 mt-1">
                                        {formatDate(historyEntry.createdAt)}
                                      </div>
                                    )}
                                    {!isCompleted && estimatedDate && (
                                      <div className="text-xs text-gray-500 mt-1">
                                        Expected: {formatDate(estimatedDate).split(',')[0]}
                                      </div>
                                    )}
                                  </div>
                                  {isCurrent && (
                                    <span className="px-2 py-1 rounded-full bg-emerald-500 text-white text-xs font-bold animate-pulse">
                                      CURRENT
                                    </span>
                                  )}
                                  {isCompleted && !isCurrent && (
                                    <span className="text-green-500 text-xl">✓</span>
                                  )}
                                </div>
                                
                                {historyEntry?.notes && (
                                  <div className="mt-2 text-sm text-gray-700 bg-white/60 p-2 rounded border border-gray-200">
                                    💬 {historyEntry.notes}
                                  </div>
                                )}
                                
                                {/* Status-specific details */}
                                {isCompleted && (
                                  <div className="mt-2 text-xs text-gray-600">
                                    {status === 'PAYMENT_CONFIRMED' && selectedItemData.payment?.paidAt && (
                                      <div>💳 Paid on {formatDate(selectedItemData.payment.paidAt)}</div>
                                    )}
                                    {status === 'IN_TRANSIT' && selectedItemData.shipment?.trackingNo && (
                                      <div className="font-mono">📦 Tracking: {selectedItemData.shipment.trackingNo}</div>
                                    )}
                                    {status === 'MOQ_REACHED' && selectedItemData.pool.moqReachedAt && (
                                      <div>🎯 MOQ reached on {formatDate(selectedItemData.pool.moqReachedAt)}</div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Detailed Activity Log */}
                {selectedItemData.statusHistory && selectedItemData.statusHistory.length > 0 && (
                  <div className="border-t-2 border-gray-200 pt-6">
                    <div className="flex items-center gap-2 mb-4">
                      <h3 className="text-lg font-bold text-gray-900">Detailed Activity Log</h3>
                      <span className="px-2 py-1 rounded-full bg-gray-200 text-gray-700 text-xs font-bold">
                        {selectedItemData.statusHistory.length} {selectedItemData.statusHistory.length === 1 ? 'event' : 'events'}
                      </span>
                    </div>
                    <div className="space-y-3">
                      {selectedItemData.statusHistory.map((history, index) => {
                        const toConfig = STATUS_CONFIG[history.toStatus];
                        const fromConfig = history.fromStatus ? STATUS_CONFIG[history.fromStatus] : null;
                        const isRecent = index < 3;

                        return (
                          <motion.div 
                            key={history.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className={`p-4 rounded-xl border-2 ${toConfig.borderColor} ${toConfig.bgColor} ${isRecent ? 'ring-2 ring-offset-2 ring-emerald-200' : ''}`}
                          >
                            <div className="flex items-start gap-3">
                              <div className="flex-shrink-0">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl border-2 ${toConfig.borderColor} ${toConfig.bgColor}`}>
                                  {toConfig.icon}
                                </div>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-2 flex-wrap">
                                  {fromConfig && (
                                    <>
                                      <span className={`text-xs font-medium px-2 py-1 rounded ${fromConfig.bgColor} ${fromConfig.textColor} border ${fromConfig.borderColor}`}>
                                        {fromConfig.icon} {fromConfig.label}
                                      </span>
                                      <span className="text-gray-400">→</span>
                                    </>
                                  )}
                                  <span className={`text-xs font-bold px-2 py-1 rounded ${toConfig.bgColor} ${toConfig.textColor} border-2 ${toConfig.borderColor}`}>
                                    {toConfig.icon} {toConfig.label}
                                  </span>
                                  {isRecent && (
                                    <span className="text-xs font-bold text-emerald-600 bg-emerald-100 px-2 py-1 rounded border border-emerald-300">
                                      RECENT
                                    </span>
                                  )}
                                </div>
                                
                                <div className="flex items-center gap-3 text-xs text-gray-600 mb-2">
                                  <span className="flex items-center gap-1">
                                    <span>📅</span>
                                    <span className="font-medium">{formatDate(history.createdAt)}</span>
                                  </span>
                                  <span className="flex items-center gap-1">
                                    {history.automated ? (
                                      <>
                                        <span>🤖</span>
                                        <span>Automated</span>
                                      </>
                                    ) : (
                                      <>
                                        <span>👤</span>
                                        <span>Manual</span>
                                      </>
                                    )}
                                  </span>
                                  {history.triggeredBy && (
                                    <span className="flex items-center gap-1">
                                      <span>by</span>
                                      <span className="font-semibold">{history.triggeredBy.name || history.triggeredBy.email}</span>
                                    </span>
                                  )}
                                </div>
                                
                                {history.notes && (
                                  <div className="mt-2 text-sm text-gray-700 bg-white/80 p-3 rounded-lg border border-gray-300 shadow-sm">
                                    <div className="flex items-start gap-2">
                                      <span className="text-base">💬</span>
                                      <p className="flex-1">{history.notes}</p>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Shipping Details - Only shown when shipment exists */}
                {selectedItemData.shipment && (
                  <div className="border-t-2 border-gray-200 pt-6 mt-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Shipping Information</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 rounded-xl bg-blue-50 border-2 border-blue-200">
                        <div className="text-xs font-semibold text-blue-600 mb-1">Carrier</div>
                        <div className="text-lg font-bold text-blue-900">
                          {selectedItemData.shipment.carrier || 'To Be Determined'}
                        </div>
                      </div>
                      <div className="p-4 rounded-xl bg-purple-50 border-2 border-purple-200">
                        <div className="text-xs font-semibold text-purple-600 mb-1">Shipment Status</div>
                        <div className="text-lg font-bold text-purple-900 capitalize">
                          {selectedItemData.shipment.status.toLowerCase()}
                        </div>
                      </div>
                      {selectedItemData.shipment.trackingNo && (
                        <div className="col-span-2 p-4 rounded-xl bg-cyan-50 border-2 border-cyan-200">
                          <div className="text-xs font-semibold text-cyan-600 mb-2">Tracking Number</div>
                          <div className="text-sm font-mono font-bold text-cyan-900 bg-white px-3 py-2 rounded border border-cyan-300">
                            {selectedItemData.shipment.trackingNo}
                          </div>
                        </div>
                      )}
                      {selectedItemData.shipment.etaDate && (
                        <div className="col-span-2 p-4 rounded-xl bg-emerald-50 border-2 border-emerald-200">
                          <div className="text-xs font-semibold text-emerald-600 mb-1">Estimated Delivery</div>
                          <div className="text-lg font-bold text-emerald-900">
                            {formatDate(selectedItemData.shipment.etaDate)}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
