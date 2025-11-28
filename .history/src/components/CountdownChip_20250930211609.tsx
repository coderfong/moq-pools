"use client";
import { useEffect, useState } from 'react';

function format(mm: number, ss: number) {
  return `${String(mm).padStart(2,'0')}:${String(ss).padStart(2,'0')}`;
}

export default function CountdownChip({ deadline, className = '' }: { deadline: Date | string | number; className?: string }) {
  const [remain, setRemain] = useState<number>(() => Math.max(0, Math.floor((new Date(deadline).getTime() - Date.now()) / 1000)));
  useEffect(() => {
    const id = setInterval(() => {
      setRemain((r) => Math.max(0, r - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [deadline]);

  const mm = Math.floor(remain / 60);
  const ss = remain % 60;
  const urgent = remain <= 60;

  return (
    <span
      className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full border-hairline text-xs ${urgent ? 'text-warning' : 'text-ink'} ${className}`.trim()}
      aria-live="polite"
      title={urgent ? 'Less than a minute left' : 'Time remaining'}
    >
      <span className={`h-2 w-2 rounded-full ${urgent ? 'bg-warning animate-pulse' : 'bg-ink/50'}`} />
      <span>{format(mm, ss)}</span>
    </span>
  );
}
