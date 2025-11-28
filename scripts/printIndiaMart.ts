import { fetchIndiaMart } from '../src/lib/providers/indiamart';

async function main() {
  const q = process.argv.slice(2).join(' ') || 'usb fan';
  const items = await fetchIndiaMart(q, 20, { headless: false, upgradeImages: false });
  for (const it of items) {
    console.log([
      it.platform,
      it.currency ? `${it.currency}` : '',
      it.price,
      it.moq,
      it.title.slice(0,80),
      it.url
    ].filter(Boolean).join(' | '));
  }
  console.log(`Total: ${items.length}`);
}

main().catch(e => { console.error(e); process.exit(1); });
