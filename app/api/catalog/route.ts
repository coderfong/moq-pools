import type { NextRequest } from 'next/server';
import { querySavedListings } from '@/lib/listingStore';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get('q') || '').trim();
  const platform = (searchParams.get('platform') || 'ALL').toUpperCase();
  const categories = (searchParams.get('categories') || '').split(',').map(s => s.trim()).filter(Boolean);
  const offset = Math.max(0, Number(searchParams.get('offset') || '0'));
  const limit = Math.min(240, Math.max(1, Number(searchParams.get('limit') || '60')));
  const items = await querySavedListings({ q, platform, categories, offset, limit });
  return new Response(JSON.stringify({ items }), { headers: { 'content-type': 'application/json' } });
}
