import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function PoolsIndexPage() {
  // This route is retired; always 404
  notFound();
  return null;
}
