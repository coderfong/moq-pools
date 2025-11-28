import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

// Recursively scan the app/ directory for page files and build route paths
async function collectRoutes(dir: string, segments: string[] = []): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });

  // Check if this directory contains a page file
  const pageFiles = entries.filter((e) => e.isFile() && /^page\.(t|j)sx?$/.test(e.name));
  const routes: string[] = [];

  if (pageFiles.length > 0) {
    // Build the route from accumulated segments
    const routePath = '/' + segments.filter(Boolean).join('/');
    routes.push(routePath === '//' ? '/' : routePath.replace(/\/+/g, '/'));
  }

  // Recurse into subdirectories
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const name = entry.name;

    // Skip API routes entirely
    if (segments.length === 0 && name === 'api') continue;
    if (name === 'api') continue;

    // Skip special Next.js folders we don't want as path segments
    // - Route groups: (group) should not appear in URL, but we still traverse
    // - Dynamic segments: [id] require params; skip to avoid broken links
    const isRouteGroup = name.startsWith('(') && name.endsWith(')');
    const isDynamic = name.startsWith('[') && name.endsWith(']');

    const childDir = path.join(dir, name);

    if (isDynamic) {
      // Traverse but do not include the segment in the URL list to avoid non-navigable links
      const childRoutes = await collectRoutes(childDir, segments /* unchanged */);
      routes.push(...childRoutes);
      continue;
    }

    if (isRouteGroup) {
      // Traverse but omit from path
      const childRoutes = await collectRoutes(childDir, segments /* unchanged */);
      routes.push(...childRoutes);
      continue;
    }

    const childRoutes = await collectRoutes(childDir, [...segments, name]);
    routes.push(...childRoutes);
  }

  return routes;
}

export async function GET() {
  try {
    const appDir = path.join(process.cwd(), 'app');
    const routes = await collectRoutes(appDir);

    // Sort: root first, then lexicographic
    const sorted = Array.from(new Set(routes))
      .sort((a, b) => (a === '/' ? -1 : b === '/' ? 1 : a.localeCompare(b)));

    return NextResponse.json({ ok: true, routes: sorted });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
