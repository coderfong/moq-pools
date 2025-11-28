import fs from 'node:fs/promises';

async function fetchOnce(url: string, headers: Record<string,string>) {
  const res = await fetch(url, { headers });
  const text = await res.text();
  console.log(url, '->', res.status, 'bytes', text.length);
  await fs.writeFile('scripts/tmp.1688.html', text);
  const aCount = (text.match(/href=/g) || []).length;
  console.log('anchor count ~', aCount);
}

(async () => {
  const q = process.argv[2] || 'socks';
  const enc = encodeURIComponent(q);
  const desktop = `https://s.1688.com/selloffer/offer_search.htm?keywords=${enc}&n=y&beginPage=1`;
  const mobile = `https://s.1688.com/selloffer/offer_search.htm?keywords=${enc}&n=y&viewtype=mini&beginPage=1`;
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Linux; Android 12; Pixel 5 Build/SP1A.210812.015) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36',
    'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Cache-Control': 'no-cache'
  } as const;
  await fetchOnce(mobile, headers as any);
  await fetchOnce(desktop, headers as any);
})();
