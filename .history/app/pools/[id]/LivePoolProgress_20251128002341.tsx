"use client";

import { useEffect, useState } from 'react';

interface PoolData {
  pledgedQty: number;
  targetQty: number;
  status: string;
}

export default function LivePoolProgress({ savedListingId }: { savedListingId: string }) {
  const [poolData, setPoolData] = useState<PoolData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPoolData = async () => {
      try {
        const res = await fetch(`/api/pools/progress?savedListingId=${savedListingId}`, {
          cache: 'no-store'
        });
        if (res.ok) {
          const data = await res.json();
          setPoolData(data);
        }
      } catch (error) {
        console.error('Failed to fetch pool progress:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPoolData();
    
    // Poll for updates every 5 seconds for live progress
    const interval = setInterval(fetchPoolData, 5000);

    return () => clearInterval(interval);
  }, [savedListingId]);

  if (loading || !poolData) {
    return (
      <div className="tp-inline mt-6 animate-pulse">
        <div className="relative h-3 w-full overflow-hidden rounded-full border-2 border-orange-200 bg-gradient-to-r from-orange-50 to-amber-50 shadow-inner">
          <div className="absolute inset-y-0 left-0 w-0 bg-gradient-to-r from-orange-400 to-amber-400"></div>
        </div>
        <div className="mt-4 text-center text-sm text-gray-500">Loading pool progress...</div>
      </div>
    );
  }

  const progress = Math.min(100, Math.round((poolData.pledgedQty / poolData.targetQty) * 100));
  const moqReached = poolData.pledgedQty >= poolData.targetQty;

  return (
    <div className="tp-inline mt-6">
      <div className="mb-3 flex items-center justify-between text-sm font-semibold">
        <span className="text-gray-700">Pool Progress</span>
        <span className={`${moqReached ? 'text-green-600' : 'text-orange-600'}`}>
          {poolData.pledgedQty} / {poolData.targetQty} units ({progress}%)
        </span>
      </div>
      
      <div className="relative h-3 w-full overflow-hidden rounded-full border-2 border-orange-200 bg-gradient-to-r from-orange-50 to-amber-50 shadow-inner">
        <div 
          className={`absolute inset-y-0 left-0 transition-all duration-500 ease-out ${
            moqReached 
              ? 'bg-gradient-to-r from-green-500 to-emerald-500' 
              : 'bg-gradient-to-r from-orange-400 to-amber-400'
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>
      
      <div className="mt-3 text-center">
        {moqReached ? (
          <div className="inline-flex items-center gap-2 rounded-full bg-green-100 border-2 border-green-300 px-4 py-2 text-sm font-bold text-green-700">
            <span className="text-lg">✅</span>
            MOQ Reached! Pool is Active
          </div>
        ) : (
          <div className="text-sm text-gray-600">
            <span className="font-semibold text-orange-600">{poolData.targetQty - poolData.pledgedQty} more units</span> needed to reach MOQ
          </div>
        )}
      </div>
    </div>
  );
}
