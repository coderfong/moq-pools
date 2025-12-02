'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';

interface FeaturedPool {
  id: string;
  savedListingId: string;
  title: string;
  image: string;
  category: string;
  targetQty: number;
  pledgedQty: number;
  progressPercentage: number;
  price: number;
  originalPrice: number;
  daysLeft: number;
  hoursLeft: number;
  minutesLeft: number;
  deadlineAt: string;
  userCount: number;
  status: string;
}

function PoolCard({ pool }: { pool: FeaturedPool }) {
  const [timeLeft, setTimeLeft] = useState({
    days: pool.daysLeft,
    hours: pool.hoursLeft,
    minutes: pool.minutesLeft,
  });

  // Update countdown every minute
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const deadline = new Date(pool.deadlineAt).getTime();
      const diff = Math.max(0, deadline - now);
      
      setTimeLeft({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
      });
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [pool.deadlineAt]);

  const percentage = Math.min(pool.progressPercentage, 100);
  const isAlmostFull = percentage >= 90;
  const urgent = timeLeft.days === 0 && timeLeft.hours < 24;
  const savingsPercentage = pool.originalPrice > 0 
    ? Math.round(((pool.originalPrice - pool.price) / pool.originalPrice) * 100)
    : 0;
  
  // Format time display
  const getTimeDisplay = () => {
    if (timeLeft.days > 0) {
      return `${timeLeft.days}d ${timeLeft.hours}h`;
    } else if (timeLeft.hours > 0) {
      return `${timeLeft.hours}h ${timeLeft.minutes}m`;
    } else {
      return `${timeLeft.minutes}m`;
    }
  };

  return (
    <div className="group relative rounded-2xl border border-gray-200 bg-white shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-3 overflow-hidden animate-fade-in-up">
      <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none"></div>
      
      <Link href={`/pools/${pool.savedListingId}`}>
        <div className="relative h-56 overflow-hidden bg-gradient-to-br from-gray-100 to-gray-50">
          <Image
            src={pool.image}
            alt={pool.title}
            fill
            className="object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
            unoptimized
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          
          <div className="absolute top-4 left-4 bg-white/95 backdrop-blur-md text-gray-800 px-3 py-1.5 rounded-full text-xs font-bold shadow-xl border border-gray-100 hover:scale-110 transition-transform">
            {pool.category}
          </div>
          
          {savingsPercentage > 0 && (
            <div className="absolute top-4 right-4 bg-gradient-to-r from-emerald-500 to-green-600 text-white px-3 py-1.5 rounded-full text-sm font-bold shadow-xl animate-pulse-slow">
              Save {savingsPercentage}%
            </div>
          )}
          
          {urgent && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-red-500 to-orange-500 text-white px-4 py-2 rounded-full text-xs font-bold animate-pulse shadow-2xl flex items-center gap-1.5">
              <svg className="w-4 h-4 animate-bounce-slow" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" clipRule="evenodd"></path>
              </svg>
              Filling Fast!
            </div>
          )}
        </div>
      </Link>

      <div className="p-6 space-y-5">
        <Link href={`/pools/${pool.savedListingId}`}>
          <h3 className="text-lg font-bold line-clamp-2 text-gray-900 group-hover:text-orange-600 transition-colors duration-300 min-h-[3.5rem] leading-tight">
            {pool.title}
          </h3>
        </Link>

        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600 font-semibold">Progress to MOQ</span>
            <span className="font-bold text-gray-900 tabular-nums">
              {pool.pledgedQty}/{pool.targetQty}
            </span>
          </div>
          
          <div className="relative w-full h-3 bg-gray-100 rounded-full overflow-hidden shadow-inner">
            <div
              className={`h-full rounded-full transition-all duration-700 ease-out relative ${
                isAlmostFull
                  ? 'bg-gradient-to-r from-emerald-500 via-green-500 to-emerald-600'
                  : 'bg-gradient-to-r from-orange-500 via-orange-600 to-amber-500'
              }`}
              {...({ style: { width: `${percentage}%` } } as any)}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full animate-shimmer"></div>
            </div>
          </div>

          {isAlmostFull && (
            <p className="text-xs text-emerald-600 font-bold flex items-center gap-1 animate-fade-in">
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path>
              </svg>
              Almost there! 🎉
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-6 pt-3 border-t border-gray-100">
          <div>
            <div className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent tabular-nums">
              ${pool.price}
            </div>
            {pool.originalPrice > 0 && (
              <div className="text-sm text-gray-400 line-through font-medium tabular-nums">
                ${pool.originalPrice}
              </div>
            )}
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-orange-500 shrink-0">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
              </svg>
              <span className="font-semibold tabular-nums">{pool.pledgedQty}</span>
            </div>
            
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`shrink-0 ${urgent ? 'text-red-500' : 'text-orange-500'}`}>
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
              <span className={`font-semibold tabular-nums ${urgent ? 'text-red-600' : ''}`}>
                {pool.daysLeft}d
              </span>
            </div>
          </div>
        </div>

        <Link
          href={`/pools/${pool.savedListingId}`}
          className="relative block w-full bg-gradient-to-r from-orange-500 via-orange-600 to-orange-500 bg-size-200 bg-pos-0 hover:bg-pos-100 text-white text-center py-3.5 rounded-xl font-bold shadow-lg hover:shadow-xl hover:shadow-orange-500/50 transition-all duration-300 hover:scale-105 overflow-hidden group/btn"
        >
          <span className="relative z-10">Join This Pool</span>
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 group-hover/btn:translate-x-full transition-transform duration-1000"></div>
        </Link>
      </div>
    </div>
  );
}

export default function FeaturedPools() {
  const [pools, setPools] = useState<FeaturedPool[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPools() {
      try {
        const response = await fetch('/api/pools/featured');
        const data = await response.json();
        setPools(data.pools || []);
      } catch (error) {
        console.error('Error fetching featured pools:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchPools();
  }, []);

  if (loading) {
    return (
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="rounded-2xl border border-gray-200 bg-white shadow-lg overflow-hidden animate-pulse">
            <div className="h-56 bg-gray-200"></div>
            <div className="p-6 space-y-5">
              <div className="h-6 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-3 bg-gray-200 rounded-full"></div>
              <div className="h-12 bg-gray-200 rounded-xl"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (pools.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-xl text-gray-600">No active pools available at the moment.</p>
        <p className="text-gray-500 mt-2">Check back soon for new deals!</p>
      </div>
    );
  }

  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
      {pools.map((pool) => (
        <PoolCard key={pool.id} pool={pool} />
      ))}
    </div>
  );
}
