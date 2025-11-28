import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default function NotFound() {
  return (
    <div className="px-6 md:px-10 xl:px-16 py-10">
      <h2 className="text-xl font-semibold mb-2">404 - Page not found</h2>
      <p className="mb-6">We couldn't find that page.</p>
      <div className="flex gap-4">
        <Link href="/" className="underline">Go home</Link>
        <Link href="/login" className="underline">Sign in</Link>
      </div>
    </div>
  );
}
