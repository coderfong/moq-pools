"use client";

import { useState } from 'react';
import Link from 'next/link';
import { Download, Search, RefreshCw, CheckCircle, Clock, Package, Truck } from 'lucide-react';

type OrderItem = {
  id: string;
  quantity: number;
  createdAt: Date;
  pool?: {
    id: string;
    status: string | null;
    targetQty: number;
    pledgedQty: number;
    deadlineAt: Date | null;
    product?: {
      id: string;
      title: string;
      imagesJson: string | null;
      unitPrice: any; // Prisma Decimal type
      baseCurrency: string | null;
      supplier?: { name: string | null } | null;
      sourcePlatform: string | null;
    } | null;
  } | null;
};

type EnhancedOrdersProps = {
  orders: OrderItem[];
  activeTab: string;
};

export default function EnhancedOrdersClient({ orders, activeTab }: EnhancedOrdersProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredOrders, setFilteredOrders] = useState(orders);

  // Handle search
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setFilteredOrders(orders);
      return;
    }

    const lowercaseQuery = query.toLowerCase();
    const filtered = orders.filter(order => {
      const title = order.pool?.product?.title?.toLowerCase() || '';
      const supplier = order.pool?.product?.supplier?.name?.toLowerCase() || '';
      return title.includes(lowercaseQuery) || supplier.includes(lowercaseQuery);
    });
    setFilteredOrders(filtered);
  };

  // Export to CSV
  const handleExportCSV = () => {
    const csvContent = [
      ['Order ID', 'Product', 'Quantity', 'Unit Price', 'Status', 'Date'].join(','),
      ...orders.map(order => [
        order.id,
        `"${order.pool?.product?.title || 'N/A'}"`,
        order.quantity,
        order.pool?.product?.unitPrice || 0,
        order.pool?.status || 'N/A',
        new Date(order.createdAt).toLocaleDateString(),
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `orders-${activeTab}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Get status icon
  const getStatusIcon = (status: string | null) => {
    switch (status) {
      case 'OPEN':
        return <Clock className="w-4 h-4" />;
      case 'LOCKED':
      case 'ORDER_PLACED':
        return <Package className="w-4 h-4" />;
      case 'FULFILLING':
        return <Truck className="w-4 h-4" />;
      case 'FULFILLED':
        return <CheckCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  // Get status color
  const getStatusColor = (status: string | null) => {
    switch (status) {
      case 'OPEN':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'LOCKED':
      case 'ORDER_PLACED':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'FULFILLING':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'FULFILLED':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'FAILED':
      case 'CANCELLED':
        return 'bg-red-100 text-red-700 border-red-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  // Get status text
  const getStatusText = (status: string | null) => {
    switch (status) {
      case 'OPEN':
        return 'Awaiting Payment';
      case 'LOCKED':
        return 'Processing';
      case 'ORDER_PLACED':
        return 'Order Placed';
      case 'FULFILLING':
        return 'Shipped';
      case 'FULFILLED':
        return 'Delivered';
      case 'FAILED':
        return 'Failed';
      case 'CANCELLED':
        return 'Cancelled';
      default:
        return 'Pending';
    }
  };

  return (
    <div className="space-y-6">
      {/* Search & Export Bar */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="relative flex-1 w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search orders by product or supplier..."
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          />
        </div>
        
        <button
          onClick={handleExportCSV}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-colors text-sm font-medium"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      {/* Results Count */}
      <div className="text-sm text-gray-600">
        {searchQuery ? (
          <>
            Found <span className="font-medium text-gray-900">{filteredOrders.length}</span> of{' '}
            <span className="font-medium text-gray-900">{orders.length}</span> orders
          </>
        ) : (
          <>
            Showing <span className="font-medium text-gray-900">{orders.length}</span> order
            {orders.length !== 1 ? 's' : ''}
          </>
        )}
      </div>

      {/* Orders List */}
      <div className="space-y-4">
        {filteredOrders.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
            <div className="text-6xl mb-4">
              {searchQuery ? '🔍' : '📦'}
            </div>
            <h2 className="text-xl font-semibold mb-2">
              {searchQuery ? 'No matching orders' : 'No orders yet'}
            </h2>
            <p className="text-gray-600 mb-6">
              {searchQuery 
                ? 'Try a different search term'
                : 'Start shopping to see your orders here'}
            </p>
            {!searchQuery && (
              <Link
                href="/products"
                className="inline-block rounded-lg bg-orange-600 text-white px-6 py-3 font-medium hover:bg-orange-700 transition-colors"
              >
                Browse Products
              </Link>
            )}
          </div>
        ) : (
          filteredOrders.map((order) => {
            const product = order.pool?.product;
            const images = product?.imagesJson ? JSON.parse(product.imagesJson) : [];
            const firstImage = Array.isArray(images) && images.length > 0 ? images[0] : null;
            const totalPrice = (Number(product?.unitPrice || 0) * order.quantity).toFixed(2);

            return (
              <div
                key={order.id}
                className="rounded-xl border border-gray-200 bg-white overflow-hidden hover:shadow-lg transition-shadow"
              >
                {/* Order Header */}
                <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-gray-600">Order ID:</span>
                      <span className="text-sm font-mono font-medium text-gray-900">
                        {order.id.substring(0, 20)}...
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border ${getStatusColor(order.pool?.status || null)}`}>
                        {getStatusIcon(order.pool?.status || null)}
                        {getStatusText(order.pool?.status || null)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Order Content */}
                <div className="p-6">
                  <div className="flex flex-col md:flex-row gap-6">
                    {/* Product Image */}
                    {firstImage && (
                      <div className="flex-shrink-0">
                        <img
                          src={firstImage}
                          alt={product?.title || 'Product'}
                          className="w-32 h-32 rounded-lg object-cover border border-gray-200"
                        />
                      </div>
                    )}

                    {/* Product Details */}
                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/products`}
                        className="text-lg font-semibold text-gray-900 hover:text-orange-600 line-clamp-2 block"
                      >
                        {product?.title || 'Product'}
                      </Link>

                      {product?.supplier?.name && (
                        <p className="text-sm text-gray-600 mt-2">
                          Supplier: <span className="font-medium">{product.supplier.name}</span>
                        </p>
                      )}

                      {/* Order Timeline */}
                      <div className="mt-4 flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              order.pool?.status === 'FULFILLED'
                                ? 'bg-green-500 w-full'
                                : order.pool?.status === 'FULFILLING'
                                ? 'bg-purple-500 w-3/4'
                                : order.pool?.status === 'LOCKED' || order.pool?.status === 'ORDER_PLACED'
                                ? 'bg-blue-500 w-1/2'
                                : 'bg-yellow-500 w-1/4'
                            }`}
                          ></div>
                        </div>
                      </div>

                      {/* Stats Grid */}
                      <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <div className="text-xs text-gray-500 uppercase tracking-wide">Quantity</div>
                          <div className="text-sm font-semibold text-gray-900 mt-1">
                            {order.quantity} units
                          </div>
                        </div>

                        <div>
                          <div className="text-xs text-gray-500 uppercase tracking-wide">Unit Price</div>
                          <div className="text-sm font-semibold text-gray-900 mt-1">
                            {product?.baseCurrency}{Number(product?.unitPrice || 0).toFixed(2)}
                          </div>
                        </div>

                        <div>
                          <div className="text-xs text-gray-500 uppercase tracking-wide">Total</div>
                          <div className="text-sm font-semibold text-gray-900 mt-1">
                            {product?.baseCurrency}{totalPrice}
                          </div>
                        </div>

                        <div>
                          <div className="text-xs text-gray-500 uppercase tracking-wide">Order Date</div>
                          <div className="text-sm font-semibold text-gray-900 mt-1">
                            {new Date(order.createdAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="mt-6 flex flex-wrap gap-3">
                        <Link
                          href={`/products`}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-600 text-white hover:bg-orange-700 transition-colors text-sm font-medium"
                        >
                          View Product
                        </Link>

                        {(order.pool?.status === 'FULFILLING' || order.pool?.status === 'FULFILLED') && (
                          <Link
                            href={`/account/orders/tracking?poolId=${order.pool?.id}`}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-colors text-sm font-medium"
                          >
                            <Truck className="w-4 h-4" />
                            Track Shipment
                          </Link>
                        )}

                        <button
                          onClick={() => {}}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-colors text-sm font-medium"
                        >
                          <Download className="w-4 h-4" />
                          Invoice
                        </button>

                        {order.pool?.status === 'FULFILLED' && (
                          <button
                            onClick={() => {}}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-colors text-sm font-medium"
                          >
                            <RefreshCw className="w-4 h-4" />
                            Reorder
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
