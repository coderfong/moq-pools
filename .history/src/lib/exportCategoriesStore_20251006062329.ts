import { prisma } from './prisma';
import crypto from 'crypto';

export interface UpsertExportCategoryInput {
  label: string;
  url: string;
  parentLabel?: string | null;
  depth?: number;
  itemCount?: number | null;
}

function hashCategory(i: UpsertExportCategoryInput) {
  const h = crypto.createHash('sha256');
  h.update([i.label.trim().toLowerCase(), i.parentLabel?.trim().toLowerCase() || '', i.url].join('|'));
  return h.digest('hex').slice(0, 32);
}

export async function upsertExportCategories(items: UpsertExportCategoryInput[]) {
  if (!items.length) return 0;
  let count = 0;
  for (const it of items) {
    const hash = hashCategory(it);
    await prisma.exportCategory.upsert({
      where: { url: it.url },
      create: {
        label: it.label,
        url: it.url,
        parentLabel: it.parentLabel || null,
        depth: it.depth ?? 0,
        itemCount: it.itemCount ?? null,
        hash,
      },
      update: {
        label: it.label,
        parentLabel: it.parentLabel || null,
        depth: it.depth ?? 0,
        itemCount: it.itemCount ?? null,
        hash,
      }
    });
    count++;
  }
  return count;
}

export async function findExportCategoriesByParent(parentLabel?: string | null) {
  return prisma.exportCategory.findMany({
    where: parentLabel ? { parentLabel } : { parentLabel: null },
    orderBy: [{ depth: 'asc' }, { label: 'asc' }]
  });
}

export async function searchExportCategories(term: string, limit = 20) {
  const t = term.trim();
  if (!t) return [];
  return prisma.exportCategory.findMany({
    where: { label: { contains: t, mode: 'insensitive' } },
    orderBy: { itemCount: 'desc' },
    take: limit
  });
}
