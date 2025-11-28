export const isIndiaMartDeadPattern = (u: string): boolean => {
  try {
    const url = new URL(u);
    const hostOk = /\.indiamart\.com$/i.test(url.hostname) || /(^|\.)indiamart\.com$/i.test(url.hostname);
    const path = url.pathname.replace(/\/+$/,'');
    return hostOk && path === '/products' && url.searchParams.has('id') && url.searchParams.has('kwd');
  } catch { return false; }
};

export const buildIndiaMartSearchUrl = (q: string): string =>
  `https://dir.indiamart.com/search.mp?ss=${encodeURIComponent(q || '')}`;

export const buildIndiaMartCategoryUrl = (slug: string): string =>
  `https://dir.indiamart.com/impcat/${encodeURIComponent(slug)}.html`;

export const normalizeIndiaMartLink = (href: string, searchTerm?: string): string => {
  try {
    if (!href) return href;
    if (isIndiaMartDeadPattern(href)) {
      return buildIndiaMartSearchUrl(searchTerm || '');
    }
  } catch {}
  return href;
};
