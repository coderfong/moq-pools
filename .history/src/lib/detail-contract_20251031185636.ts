export type Tier = { price: string; range: string };

export type NormalizedDetail = {
  title: string;
  priceText: string | null;
  priceTiers: Tier[];
  soldCount: number | null;
  moq: number | null; // normalized numeric MOQ
  heroImage: string | null;
  attributes: Array<[string, string]>;
  packaging: Array<[string, string]>;
  protections: string[];
  supplier: { name: string | null; logo: string | null };
  skuHtml: string | null;
  debug?: string[];
  // Optional loose field to help derive moq when not provided
  moqText?: string | null;
};

export type ListingFallback = {
  title?: string | null;
  priceRaw?: string | null;
  priceMin?: number | null;
  priceMax?: number | null;
  currency?: string | null;
  ordersRaw?: string | null;
  image?: string | null;
};

export const currencySym = (c?: string | null) =>
  c === 'USD' || !c ? 'US$' : c === 'CNY' || c === 'RMB' ? '¥' : c === 'INR' ? '₹' : c;

const formatPrice = (n?: number | null) => {
  if (n == null || !isFinite(n)) return null;
  const v = Number(n);
  // up to 2 decimals typical
  return v % 1 === 0
    ? v.toLocaleString('en-US', { maximumFractionDigits: 0 })
    : v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export const formatRange = (min?: number | null, max?: number | null, cur?: string | null) => {
  const sym = currencySym(cur);
  const lo = formatPrice(min);
  const hi = formatPrice(max);
  if (lo && hi && lo !== hi) return `${sym}${lo} - ${sym}${hi}`;
  if (lo) return `${sym}${lo}`;
  if (hi) return `${sym}${hi}`;
  return null;
};

export const parseOrders = (s?: string | null): number | null => {
  if (!s) return null;
  const m = s.match(/(\d[\d,\.]*?)\s*(sold|orders)/i)?.[1];
  return m ? Number(m.replace(/[,\.]/g, '')) : null;
};

const parseMoqFromText = (s?: string | null): number | null => {
  if (!s) return null;
  const m = s.match(/([≥>]?\s*\d[\d,]*)/);
  if (!m) return null;
  const raw = m[1].replace(/[≥>\s,]/g, '');
  const n = parseInt(raw, 10);
  return isFinite(n) && n > 0 ? n : null;
};

export function BAD(d?: NormalizedDetail | null): boolean {
  // Treat as bad if missing, missing hero, missing price, missing tiers, or sparse attributes/packaging
  return (
    !d ||
    !d.heroImage ||
    !d.priceText ||
    !d.priceTiers?.length ||
    // treat sparse pages as weak, so we heal them
    ((d.attributes?.length ?? 0) < 3 && (d.packaging?.length ?? 0) < 1)
  );
}

export function normalizeDetail(input: Partial<NormalizedDetail>, listing: ListingFallback): NormalizedDetail {
  const out: NormalizedDetail = {
    title: (input.title || listing.title || '').trim(),
    priceText: input.priceText ?? null,
    priceTiers: Array.isArray(input.priceTiers) ? [...input.priceTiers] : [],
    soldCount: input.soldCount ?? null,
    moq: input.moq ?? parseMoqFromText(input.moqText) ?? 1,
    heroImage: input.heroImage ?? listing.image ?? '/seed/sleeves.jpg',
    attributes: Array.isArray(input.attributes) ? input.attributes : [],
    packaging: Array.isArray(input.packaging) ? input.packaging : [],
    protections: Array.isArray(input.protections) ? input.protections : [],
    supplier: input.supplier || { name: null, logo: null },
    skuHtml: input.skuHtml ?? null,
    debug: input.debug ? [...input.debug] : undefined,
    moqText: input.moqText ?? null,
  };

  // PriceText fallback
  if (!out.priceText) {
    out.priceText = listing.priceRaw ?? formatRange(listing.priceMin, listing.priceMax, listing.currency);
  }

  // Ensure MOQ sane
  if (!out.moq || out.moq < 1) out.moq = 1;

  // Ensure tiers available
  if (!out.priceTiers || out.priceTiers.length === 0) {
    out.priceTiers = [{ price: out.priceText ?? '—', range: `≥ ${out.moq}` }];
    out.debug = [...(out.debug || []), 'normalize:synth-tier'];
  }

  // Sold fallback
  if (out.soldCount == null) out.soldCount = parseOrders(listing.ordersRaw);

  // Hard guarantees
  if (!out.heroImage) out.heroImage = listing.image ?? '/seed/sleeves.jpg';
  if (!out.moq || out.moq < 1) out.moq = 1;
  if (!out.priceTiers.length) out.priceTiers = [{ price: out.priceText ?? '—', range: `≥ ${out.moq}` }];

  return out;
}

export const isWeakDetail = (d: NormalizedDetail): boolean => {
  try {
    // Use the same logic as BAD for consistency
    return BAD(d);
  } catch { return true; }
};
