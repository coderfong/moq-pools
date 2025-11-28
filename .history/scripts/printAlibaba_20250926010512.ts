import { fetchAlibaba } from '@/lib/providers/alibaba';

(async () => {
  const q = process.argv[2] || 'keyboard';
  const limit = Number(process.argv[3] || 12);
  const items = await fetchAlibaba(q, limit, { headless: false });
  console.log(JSON.stringify(items.map(i => ({ title: i.title, image: i.image, url: i.url, price: i.price })), null, 2));
})();
