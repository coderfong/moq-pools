"use client";
import React from 'react';

// Route-level error boundary for /products to avoid falling back to Next's internal boundary
// which may use client-only hooks during SSR in dev (Turbo) and trigger invalid hook calls.
// This component purposely avoids any next/navigation hooks.
export default function ProductsError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="px-6 md:px-10 xl:px-16 py-10">
      <h2 className="text-xl font-semibold mb-3">Something went wrong loading products</h2>
      <pre className="whitespace-pre-wrap text-sm opacity-80 mb-6">{String(error?.message || error)}</pre>
      <div className="flex gap-3">
        <button
          className="inline-flex items-center rounded bg-black text-white px-4 py-2"
          onClick={() => reset()}
        >
          Try again
        </button>
        <a href="/products" className="inline-flex items-center rounded border px-4 py-2">Go to /products</a>
        <a href="/" className="inline-flex items-center rounded border px-4 py-2">Home</a>
      </div>
    </div>
  );
}
