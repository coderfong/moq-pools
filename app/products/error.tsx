"use client";

import { useEffect } from "react";

// Error boundary for /products route segment
// Next.js requires error.tsx in the App Router to be a Client Component
// Docs: https://nextjs.org/docs/app/building-your-application/routing/error-handling

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
	useEffect(() => {
		// Log the error to an error reporting service or console in dev
		if (process.env.NODE_ENV !== "production") {
			// eslint-disable-next-line no-console
			console.error("/products error boundary:", error);
		}
	}, [error]);

	return (
		<div className="mx-auto max-w-3xl px-6 py-10">
			<div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
				<h2 className="text-xl font-semibold text-gray-900">Something went wrong</h2>
				<p className="mt-2 text-sm text-gray-700">
					We couldn’t load this section. You can try again or go back to the main products page.
				</p>
				<div className="mt-4 flex gap-3">
					<button
						type="button"
						onClick={() => reset()}
						className="inline-flex items-center rounded-md bg-black px-3 py-1.5 text-sm font-medium text-white hover:bg-black/90"
					>
						Try again
					</button>
					<a
						href="/products"
						className="inline-flex items-center rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-900 hover:bg-gray-50"
					>
						Back to products
					</a>
				</div>
				{error?.digest ? (
					<p className="mt-3 text-xs text-gray-500">Error ID: {error.digest}</p>
				) : null}
			</div>
		</div>
	);
}

