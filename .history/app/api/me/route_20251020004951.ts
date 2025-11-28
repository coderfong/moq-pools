import { NextResponse } from 'next/server';

// Minimal /api/me endpoint. If you have auth, replace with real session lookup.
// For now we return ok:false with 200 so the Navbar can gracefully show unauthenticated UI without console 401s.
export async function GET() {
  return NextResponse.json({ ok: false, user: null });
}
