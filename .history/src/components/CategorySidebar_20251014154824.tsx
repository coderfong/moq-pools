import Link from 'next/link';
import { SHARED_CATEGORIES, getSharedSearchTerms, type SharedCategoryNode } from '@/lib/sharedTaxonomy';

type Props = {
  platform: string;
  currentQuery?: string;
  maxSubcategories?: number; // how many subcategory links to show per top category
};

function buildHref(platform: string, key: string, label: string) {
  const terms = getSharedSearchTerms(key);
  const q = terms.length ? terms[0] : label;
  const usp = new URLSearchParams();
  if (platform && platform !== 'ALL') usp.set('platform', platform);
  usp.set('q', q);
  usp.set('per', '50');
  usp.set('page', '1');
  usp.set('lk', key);
  return `/products?${usp.toString()}`;
}

function pickSubs(top: SharedCategoryNode, max: number): { key: string; label: string }[] {
  // Prefer second-level children as subcategories; if missing, fall back to leaves
  const subs: { key: string; label: string }[] = [];
  if (top.children && top.children.length) {
    for (const c of top.children) {
      subs.push({ key: c.key, label: c.label });
      if (subs.length >= max) break;
    }
  } else if (top.leaves && top.leaves.length) {
    for (const l of top.leaves) {
      subs.push({ key: l.key, label: l.label });
      if (subs.length >= max) break;
    }
  }
  return subs;
}

export default function CategorySidebar({ platform, currentQuery, maxSubcategories = 4 }: Props) {
  return (
    <nav aria-label="Category sidebar" className="bg-white rounded-2xl border border-gray-200 shadow-sm p-3">
      <div className="space-y-4">
        {SHARED_CATEGORIES.map((top) => {
          const subs = pickSubs(top, maxSubcategories);
          return (
            <dl key={top.key} className="nav-list">
              <dt className="mb-2">
                <Link href={buildHref(platform, top.key, top.label)} className="text-sm font-semibold text-gray-900 hover:text-orange-700">
                  {top.label}
                </Link>
              </dt>
              {subs.map((s) => (
                <dd key={s.key} className="mb-1">
                  <Link href={buildHref(platform, s.key, s.label)} className="text-sm text-gray-700 hover:text-orange-700">
                    {s.label}
                  </Link>
                </dd>
              ))}
              <dd className="more mt-1">
                <Link href={buildHref(platform, top.key, top.label)} className="inline-flex items-center gap-1 text-sm text-orange-700 hover:underline">
                  <div>See More</div>
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
                </Link>
              </dd>
            </dl>
          );
        })}
      </div>
    </nav>
  );
}
