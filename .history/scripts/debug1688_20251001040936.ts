import { fetchC1688 } from '@/lib/providers/c1688';

async function main() {
  const q = process.argv[2] || 'socks';
  const limit = Number(process.argv[3] || 20);
  const headless = String(process.argv[4] || '0').match(/^(1|true|yes|y)$/i) ? true : false;
  const items = await fetchC1688(q, limit, { headless });
  console.log(`Fetched ${items.length} items for "${q}" (headless=${headless})`);
  for (const it of items.slice(0, 10)) {
    console.log({ url: it.url, title: it.title, price: it.price, moq: it.moq, image: it.image?.slice(0, 60) });
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
