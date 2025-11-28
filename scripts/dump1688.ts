import fs from 'node:fs/promises';
import path from 'node:path';

function getArg(name: string, def?: string) {
  const rx = new RegExp(`^--${name}=(.*)$`);
  for (const a of process.argv.slice(2)) {
    const m = a.match(rx);
    if (m) return m[1];
  }
  return def;
}

async function readCookie() {
  const env = (process.env.C1688_COOKIES || '').trim();
  if (env) return env;
  try {
    const raw = await fs.readFile(path.resolve('scripts/cookies.1688.txt'), 'utf8');
    return raw.replace(/\r?\n/g, ' ').trim();
  } catch { return ''; }
}

async function dumpHtml(q: string) {
  const cookie = await readCookie();
  if (!cookie) throw new Error('No C1688_COOKIES or scripts/cookies.1688.txt');
  const enc = encodeURIComponent(q);
  const desktopUrl = `https://s.1688.com/selloffer/offer_search.htm?keywords=${enc}&n=y`;
  const mobileUrl = `https://m.1688.com/offer_search/-${enc}.html`;
  const headersDesk = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36',
    'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
    'Cookie': cookie,
  } as Record<string,string>;
  const headersMob = {
    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
    'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
    'Cookie': cookie,
  } as Record<string,string>;

  await fs.mkdir(path.resolve('tmp'), { recursive: true });
  const deskRes = await fetch(desktopUrl, { headers: headersDesk, cache: 'no-store' });
  const deskHtml = await deskRes.text();
  const mobRes = await fetch(mobileUrl, { headers: headersMob, cache: 'no-store' });
  const mobHtml = await mobRes.text();

  const deskPath = path.resolve('tmp/1688-desktop.html');
  const mobPath = path.resolve('tmp/1688-mobile.html');
  await fs.writeFile(deskPath, deskHtml, 'utf8');
  await fs.writeFile(mobPath, mobHtml, 'utf8');

  const count = (s: string, rx: RegExp) => (s.match(rx) || []).length;
  const dOffers = count(deskHtml, /href\s*=\s*"[^"]*(offer[_-]?detail|offerDetail|offer_detail|\/offer\/)/ig);
  const mOffers = count(mobHtml, /href\s*=\s*"[^"]*(offer[_-]?detail|offerDetail|offer_detail|\/offer\/)/ig);
  console.log(`Desktop status=${deskRes.status} offers~${dOffers} saved: ${deskPath}`);
  console.log(`Mobile  status=${mobRes.status} offers~${mOffers} saved: ${mobPath}`);
}

(async () => {
  const q = getArg('q', '袜子')!;
  await dumpHtml(q);
})();
