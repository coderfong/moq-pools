"use client";

import { useEffect, useState, useCallback } from "react";

interface PoolProgressData {
  pledgedQty: number;
  targetQty: number;
  status: string;
  participantCount: number;
}

interface PoolProgressTrackerProps {
  poolId: string;
  initialPledgedQty: number;
  targetQty: number;
  pollInterval?: number; // milliseconds, default 30000 (30s)
  onProgressUpdate?: (data: PoolProgressData) => void;
}

/**
 * Client component that polls the server for pool progress updates
 * Use this on pool detail pages to keep the progress bar updated in real-time
 */
export default function PoolProgressTracker({
  poolId,
  initialPledgedQty,
  targetQty,
  pollInterval = 30000,
  onProgressUpdate,
}: PoolProgressTrackerProps) {
  const [pledgedQty, setPledgedQty] = useState(initialPledgedQty);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const fetchPoolProgress = useCallback(async () => {
    try {
      const res = await fetch(`/api/pools/${poolId}/progress`, {
        cache: "no-store",
      });

      if (res.ok) {
        const data: PoolProgressData = await res.json();
        
        // Only update if the value actually changed
        if (data.pledgedQty !== pledgedQty) {
          setPledgedQty(data.pledgedQty);
          setLastUpdate(new Date());
          
          if (onProgressUpdate) {
            onProgressUpdate(data);
          }
        }
      }
    } catch (error) {
      console.error("Failed to fetch pool progress:", error);
    }
  }, [poolId, pledgedQty, onProgressUpdate]);

  useEffect(() => {
    // Set up polling interval
    const interval = setInterval(fetchPoolProgress, pollInterval);

    // Also fetch once on mount
    fetchPoolProgress();

    // Cleanup on unmount
    return () => clearInterval(interval);
  }, [fetchPoolProgress, pollInterval]);

  // This component doesn't render anything visible
  // It just manages the polling logic
  return null;
}
