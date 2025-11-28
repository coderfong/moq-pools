import React from "react";
import Link from "next/link";
import { getSession } from '../../api/_lib/session';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import EnhancedOrdersClient from "./EnhancedOrdersClient";

export const metadata = { title: "Orders - Account - MOQ Pools" };

export default async function OrdersPage({ 
  searchParams 
}: { 
  searchParams?: Record<string, string | string[] | undefined> 
}) {
  const session = getSession();
  if (!session?.sub || !prisma) redirect('/login?next=/account/orders');

  const tab = String(searchParams?.tab || 'all').toLowerCase();
  
  // Build status filter based on the correct PoolStatus enum
  let statusFilter: any = {};
  if (tab === 'awaiting-payment') statusFilter = { status: 'OPEN' };
  else if (tab === 'processing') statusFilter = { status: { in: ['LOCKED', 'ORDER_PLACED'] } };
  else if (tab === 'shipped') statusFilter = { status: 'FULFILLING' };
  else if (tab === 'completed') statusFilter = { status: 'FULFILLED' };

  // Fetch user's pool items with pool and listing details
  const poolItems = await prisma.poolItem.findMany({
    where: {
      userId: session.sub,
      ...(tab !== 'all' && { pool: statusFilter }),
    },
    orderBy: { createdAt: 'desc' },
    include: {
      pool: {
        select: {
          id: true,
          status: true,
          targetQty: true,
          pledgedQty: true,
          deadlineAt: true,
          product: {
            select: {
              id: true,
              title: true,
              imagesJson: true,
              unitPrice: true,
              baseCurrency: true,
              supplier: {
                select: {
                  name: true,
                },
              },
              sourcePlatform: true,
            },
          },
        },
      },
    },
  });

  const active = (t: string) => 
    tab === t 
      ? 'bg-orange-600 text-white' 
      : 'bg-gray-100 text-gray-700 hover:bg-gray-200';

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'OPEN':
        return 'bg-green-100 text-green-700';
      case 'LOCKED':
      case 'ORDER_PLACED':
        return 'bg-blue-100 text-blue-700';
      case 'FULFILLING':
        return 'bg-purple-100 text-purple-700';
      case 'FULFILLED':
        return 'bg-green-100 text-green-700';
      case 'FAILED':
      case 'CANCELLED':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <section className="mx-auto w-full max-w-[1100px] px-4 py-6 text-neutral-900">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Orders</h1>
        <Link 
          href="/pools" 
          className="rounded-md bg-orange-600 text-white px-4 py-2 text-sm hover:bg-orange-700 transition-colors"
        >
          Browse Products
        </Link>
      </div>
      
      <nav className="mt-4 flex flex-wrap items-center gap-2">
        <Link 
          href="/account/orders?tab=awaiting-payment" 
          className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${active('awaiting-payment')}`}
        >
          Awaiting payment
        </Link>
        <Link 
          href="/account/orders?tab=processing" 
          className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${active('processing')}`}
        >
          Processing
        </Link>
        <Link 
          href="/account/orders?tab=shipped" 
          className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${active('shipped')}`}
        >
          Shipped
        </Link>
        <Link 
          href="/account/orders?tab=completed" 
          className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${active('completed')}`}
        >
          Completed
        </Link>
        <Link 
          href="/account/orders?tab=all" 
          className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${active('all')}`}
        >
          All
        </Link>
      </nav>

      <div className="mt-6 space-y-4">
        {poolItems.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
            <div className="text-6xl mb-4">📦</div>
            <h2 className="text-xl font-semibold mb-2">No orders yet</h2>
            <p className="text-gray-600 mb-6">
              {tab === 'all' 
                ? 'Start shopping to see your orders here'
                : `No orders with "${tab.replace('-', ' ')}" status`}
            </p>
            <Link
              href="/pools"
              className="inline-block rounded-md bg-orange-600 text-white px-6 py-3 font-medium hover:bg-orange-700 transition-colors"
            >
              Browse Products
            </Link>
          </div>
        ) : (
          <>
            <div className="text-sm text-gray-600 mb-4">
              Showing <span className="font-medium">{poolItems.length}</span> {tab !== 'all' ? tab.replace('-', ' ') : ''} order{poolItems.length !== 1 ? 's' : ''}
            </div>
            
            {poolItems.map((item) => {
              const product = item.pool?.product;
              const images = product?.imagesJson ? JSON.parse(product.imagesJson) : [];
              const firstImage = Array.isArray(images) && images.length > 0 ? images[0] : null;
              
              return (
                <div
                  key={item.id}
                  className="rounded-xl border border-gray-200 bg-white p-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex flex-col md:flex-row gap-6">
                    {/* Product Image */}
                    {firstImage && (
                      <div className="flex-shrink-0">
                        <img
                          src={firstImage}
                          alt={product?.title || 'Product'}
                          className="w-32 h-32 rounded-lg object-cover"
                        />
                      </div>
                    )}

                    {/* Product Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <Link
                            href={`/pools/${item.pool?.id}`}
                            className="text-lg font-semibold text-gray-900 hover:text-orange-600 line-clamp-2"
                          >
                            {product?.title || 'Product'}
                          </Link>
                          
                          {product?.supplier?.name && (
                            <p className="text-sm text-gray-600 mt-1">
                              Supplier: {product.supplier.name}
                            </p>
                          )}
                          
                          {product?.sourcePlatform && (
                            <p className="text-xs text-gray-500 mt-1">
                              Platform: {product.sourcePlatform}
                            </p>
                          )}
                        </div>

                        <span
                          className={`text-xs px-3 py-1 rounded-full font-medium whitespace-nowrap ${getStatusBadge(item.pool?.status || null)}`}
                        >
                          {item.pool?.status || 'Pending'}
                        </span>
                      </div>

                      {/* Order Details */}
                      <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <div className="text-gray-500">Quantity</div>
                          <div className="font-medium text-gray-900 mt-1">
                            {item.quantity} units
                          </div>
                        </div>
                        
                        <div>
                          <div className="text-gray-500">Unit Price</div>
                          <div className="font-medium text-gray-900 mt-1">
                            {product?.baseCurrency}{Number(product?.unitPrice || 0).toFixed(2)}
                          </div>
                        </div>
                        
                        <div>
                          <div className="text-gray-500">Order Date</div>
                          <div className="font-medium text-gray-900 mt-1">
                            {new Date(item.createdAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </div>
                        </div>

                        {item.pool && (
                          <div>
                            <div className="text-gray-500">Pool Progress</div>
                            <div className="font-medium text-gray-900 mt-1">
                              {item.pool.pledgedQty || 0} / {item.pool.targetQty || 0}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="mt-4 flex gap-3">
                        <Link
                          href={`/pools/${item.pool?.id}`}
                          className="text-sm text-orange-600 hover:text-orange-700 font-medium"
                        >
                          View Product →
                        </Link>
                        {(item.pool?.status === 'FULFILLING' || item.pool?.status === 'FULFILLED') && (
                          <Link
                            href={`/account/orders/tracking?poolId=${item.poolId}`}
                            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                          >
                            Track Shipment →
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>
    </section>
  );
}
