import { computeDisplayTitle, sanitizeTitle } from '@/lib/title';
import type { ExternalListing } from '@/lib/providers/types';

function assertEqual(actual: any, expected: any, msg: string) {
  if (actual !== expected) {
    console.error(`FAIL: ${msg}\n  expected: ${expected}\n  actual:   ${actual}`);
    process.exitCode = 1;
  } else {
    console.log(`PASS: ${msg}`);
  }
}

(function run() {
  // sanitizeTitle basic
  assertEqual(sanitizeTitle('Fancy socks 1601577955132.html'), 'Fancy socks', 'strip trailing id + .html');
  assertEqual(sanitizeTitle('Widget-ABC-1600082383276'), 'Widget ABC', 'strip trailing long numeric id, normalize separators');
  assertEqual(sanitizeTitle('Cool product.aspx?foo=bar'), 'Cool product', 'strip trailing extension and query');

  // computeDisplayTitle from title
  const a: ExternalListing = { platform: 'ALIBABA', title: 'Great item 1601577955132.html', image: '', url: 'https://example.com/p/great-item-1601577955132.html', price: '' };
  assertEqual(computeDisplayTitle(a), 'Great item', 'compute from title');

  // computeDisplayTitle from description
  const b: ExternalListing = { platform: 'ALIBABA', title: 'See listing', description: 'High quality socks 1601577955132.html. Best price', image: '', url: 'https://x/y', price: '' };
  assertEqual(computeDisplayTitle(b), 'High quality socks', 'compute from description first sentence');

  // computeDisplayTitle from URL when needed
  const c: ExternalListing = { platform: 'ALIBABA', title: '', image: '', url: 'https://site.com/cool-super-product-1601577955132.html', price: '' };
  assertEqual(computeDisplayTitle(c), 'cool super product', 'compute from URL path');

  // prefer displayTitle if present
  const d: any = { platform: 'ALIBABA', title: 'bad title', displayTitle: 'Nice Canonical Name', image: '', url: 'https://x', price: '' } as ExternalListing & { displayTitle: string };
  assertEqual(computeDisplayTitle(d), 'Nice Canonical Name', 'prefer server-provided displayTitle');
})();
