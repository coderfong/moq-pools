import * as cheerio from 'cheerio';

export type ExternalItem = { title: string; image: string; price: string; url: string };

export async function fetchAliExpress(q: string, limit = 10): Promise<ExternalItem[]> {
  const url = `https://www.aliexpress.com/wholesale?SearchText=${encodeURIComponent(q)}`;
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!res.ok) return [];
  const html = await res.text();
  const $ = cheerio.load(html);
  const items: ExternalItem[] = [];
  $('a').each((_, el) => {
    const href = $(el).attr('href') || '';
    const title = $(el).attr('title') || $(el).text().trim();
    const img = $(el).find('img').attr('src') || $(el).find('img').attr('image-src') || '';
    const price = $(el).text().match(/\$\s?\d[\d,.]*/)?.[0] || '';
    if (href.includes('aliexpress.com/item') && title) {
      items.push({ title, image: img, price, url: href.startsWith('http') ? href : `https:${href}` });
    }
  });
  return items.slice(0, limit);
}
