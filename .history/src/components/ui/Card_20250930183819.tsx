import React from 'react';

export default function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl bg-white dark:bg-[hsl(var(--card))] border border-gray-200 dark:border-gray-800 shadow-card ${className}`.trim()}>
      {children}
    </div>
  );
}
