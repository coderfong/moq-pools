"use client";

import SyncedCountdown from '../../../src/components/SyncedCountdown';

export default function PoolTimer({ deadline }: { deadline: string }) {
  return (
    <div className="text-base md:text-lg text-gray-900 flex-shrink-0">
      <span className="inline-flex items-center gap-2 rounded-2xl border-2 border-orange-300 bg-gradient-to-r from-orange-100 to-amber-100 px-6 py-3 font-bold shadow-lg">
        <SyncedCountdown size="lg" variant="accent" showIcon={true} />
      </span>
    </div>
  );
}
