// Supported external platforms for scraping/aggregation
export type PlatformKey =
  | 'ALIBABA'
  | 'C1688'
  | 'MADE_IN_CHINA'
  | 'INDIAMART'
  | 'TAOBAO';

export type ExternalListing = {
  platform: PlatformKey;
  title: string;
  image: string;
  url: string;
  price: string;       // keep as-is (may include currency/symbol and ranges)
  currency?: string;   // optional extracted currency
  moq?: string;        // e.g., "MOQ 100 pcs" or "≥ 10"
  orders?: string;     // e.g., "1,234 orders"
  rating?: string;     // e.g., "4.8"
  storeName?: string;  // seller/store when available
  description?: string; // short snippet/feature text when available
};
