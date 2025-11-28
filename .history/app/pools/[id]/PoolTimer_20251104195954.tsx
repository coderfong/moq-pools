"use client";

import { useEffect, useState } from 'react';

export default function PoolTimer({ deadline }: { deadline: string }) {
  const [timeLeft, setTimeLeft] = useState({ dd: '00', hh: '00', mm: '00' });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    const updateTimer = () => {
      const now = Date.now();
      const end = new Date(deadline).getTime();
      const diff = Math.max(0, end - now);
      
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      
      setTimeLeft({
        dd: String(days).padStart(2, '0'),
        hh: String(hours).padStart(2, '0'),
        mm: String(minutes).padStart(2, '0'),
      });
    };

    updateTimer();
    const interval = setInterval(updateTimer, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [deadline]);

  if (!mounted) {
    return (
      <div className="text-base md:text-lg text-gray-900 flex-shrink-0">
        <span className="inline-flex items-center gap-2 rounded-2xl border-2 border-orange-300 bg-gradient-to-r from-orange-100 to-amber-100 px-6 py-3 font-bold shadow-lg">
          ⏰ <span>00</span>d <span>00</span>h <span>00</span>m
        </span>
      </div>
    );
  }

  return (
    <div className="text-base md:text-lg text-gray-900 flex-shrink-0">
      <span className="inline-flex items-center gap-2 rounded-2xl border-2 border-orange-300 bg-gradient-to-r from-orange-100 to-amber-100 px-6 py-3 font-bold shadow-lg">
        ⏰ <span>{timeLeft.dd}</span>d <span>{timeLeft.hh}</span>h <span>{timeLeft.mm}</span>m
      </span>
    </div>
  );
}
