"use client";
import React from 'react';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="px-6 md:px-10 xl:px-16 py-10">
      <h2 className="text-xl font-semibold mb-4">Something went wrong</h2>
      <pre className="whitespace-pre-wrap text-sm opacity-80 mb-6">{String(error?.message || error)}</pre>
      <button
        className="inline-flex items-center rounded bg-black text-white px-4 py-2"
        onClick={() => reset()}
      >
        Try again
      </button>
    </div>
  );
}
