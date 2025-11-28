import { CATEGORIES, Category } from './categories';

/** Simple deterministic pseudo-random generator (LCG) */
function makeRng(seed: number) {
  let s = (seed >>> 0) || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

export type RotationItem = {
  category: string;
  query: string;
  kind: 'term' | 'featured' | 'alias';
  weight: number;
  priority: number;
};

export type BuildRotationOptions = {
  seed?: number;
  perCategory?: number; // total queries per category (approx)
  includeAliases?: boolean;
  includeFeatured?: boolean;
};

export function buildCategoryRotation(opts: BuildRotationOptions = {}): RotationItem[] {
  const rng = makeRng(opts.seed ?? Date.now());
  const perCat = Math.max(1, opts.perCategory ?? 6);
  const out: RotationItem[] = [];

  const cats = [...CATEGORIES];
  // Sort by (priority desc, weight desc) to bias ordering before random slicing
  cats.sort((a, b) => (b.ingest?.priority ?? 0) - (a.ingest?.priority ?? 0) || (b.weight ?? 1) - (a.weight ?? 1));

  for (const cat of cats) {
    const baseWeight = cat.weight ?? 1;
    const maxFeatured = cat.ingest?.maxFeaturedPerCycle ?? Math.min(8, perCat);
    const bucket: RotationItem[] = [];

    // Always include the base term first
    bucket.push({ category: cat.key, query: cat.term, kind: 'term', weight: baseWeight, priority: cat.ingest?.priority ?? 0 });

    if (opts.includeFeatured !== false && cat.featured?.length) {
      // Shuffle featured deterministically using RNG
      const feat = [...cat.featured];
      feat.sort(() => rng() - 0.5);
      for (const q of feat.slice(0, Math.min(maxFeatured, perCat - 1))) {
        bucket.push({ category: cat.key, query: q, kind: 'featured', weight: baseWeight * 0.9, priority: cat.ingest?.priority ?? 0 });
      }
    }
    if (opts.includeAliases !== false && cat.aliases?.length) {
      const aliases = [...cat.aliases];
      aliases.sort(() => rng() - 0.5);
      // Add up to 2 aliases (tunable)
      for (const a of aliases.slice(0, Math.min(2, perCat))) {
        bucket.push({ category: cat.key, query: a, kind: 'alias', weight: baseWeight * 0.8, priority: cat.ingest?.priority ?? 0 });
      }
    }

    // If we exceeded perCat, trim with a stable random scoring
    if (bucket.length > perCat) {
      const scored = bucket.map(it => ({ it, score: rng() }));
      scored.sort((a, b) => a.score - b.score);
      // Keep first perCat but ensure we keep the base term
      let subset = scored.slice(0, perCat).map(s => s.it);
      if (!subset.find(x => x.kind === 'term')) {
        // Replace last element with base term
        subset[subset.length - 1] = bucket.find(x => x.kind === 'term')!;
      }
      bucket.length = 0;
      bucket.push(...subset);
    }

    out.push(...bucket);
  }

  // Global shuffle influenced by priority & weight
  const scoredGlobal = out.map(it => ({ it, score: (rng() * 0.7) + ((it.priority || 0) * -0.01) + (1 / (it.weight || 1)) * 0.01 }));
  scoredGlobal.sort((a, b) => a.score - b.score);
  return scoredGlobal.map(s => s.it);
}

export function sampleRotation(limit: number, opts?: BuildRotationOptions): RotationItem[] {
  const all = buildCategoryRotation(opts);
  return all.slice(0, Math.min(limit, all.length));
}
