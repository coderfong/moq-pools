"use client";

import PoolTimer from './PoolTimer';

export default function PoolTimerInjector({ deadline }: { deadline: string }) {
  return <PoolTimer deadline={deadline} />;
}
