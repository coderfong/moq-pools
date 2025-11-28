export type PlatformKey = 'C1688' | 'ALIBABA' | 'MADE_IN_CHINA' | 'INDIAMART' | 'INDIAMART_EXPORT' | 'TAOBAO' | 'ALL';

export function platformLabel(p: PlatformKey) {
  return ({
    C1688: '1688.com',
    ALIBABA: 'Alibaba.com',
    MADE_IN_CHINA: 'Made-in-China',
    INDIAMART: 'IndiaMART',
    INDIAMART_EXPORT: 'IndiaMART Export',
    TAOBAO: 'Taobao',
    ALL: 'All'
  } as const)[p];
}

// Build an external search URL on the supplier website.
// We only use public query endpoints to avoid scraping / CORS issues.
export function buildExternalSearchUrl(platform: PlatformKey, q: string) {
  const term = encodeURIComponent(q || '');
  switch (platform) {
    case 'C1688':        // 1688 search
      return `https://s.1688.com/selloffer/offer_search.htm?keywords=${term}`;
    case 'ALIBABA':      // Alibaba
      return `https://www.alibaba.com/trade/search?fsb=y&IndexArea=product_en&SearchText=${term}`;
    case 'MADE_IN_CHINA':
      return `https://www.made-in-china.com/products-search/hot-china-products/${term}.html`;
    case 'INDIAMART':
      return `https://dir.indiamart.com/search.mp?ss=${term}`;
    case 'INDIAMART_EXPORT':
      return `https://export.indiamart.com/search.php?ss=${term}`;
    case 'TAOBAO':
      return `https://s.taobao.com/search?q=${term}`;
    case 'ALL':
    default:
      return '';
  }
}
