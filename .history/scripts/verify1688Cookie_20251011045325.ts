import fs from 'node:fs/promises';
import path from 'node:path';

async function readCookieFromEnvOrFile() {
  let v = process.env.C1688_COOKIES?.trim();
  if (v && v.length > 5) return v;
  try {
    const p = path.resolve('scripts/cookies.1688.txt');
    const raw = await fs.readFile(p, 'utf8');
    return raw.replace(/\r?\n/g, ' ').trim();
  } catch {
    return '';
  }
}

async function check(url: string, cookie: string, ua: string) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': ua,
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
      'Cookie': cookie,
    },
    cache: 'no-store',
  });
  const html = await res.text();
  const blocked = /login\.1688\.com|x5secdata/i.test(html) || res.status === 302;
  const offerAnchors = (
    (html.match(/\bhref\s*=\s*"[^"]*\/offer\//gi) || []).length
    + (html.match(/\bhref\s*=\s*"[^"]*(offer[_-]?detail|offerDetail|offer_detail)/gi) || []).length
  );
  return { blocked, offerAnchors, status: res.status };
}

(async () => {
  const cookie = await readCookieFromEnvOrFile();
  if (!cookie) {
    console.log('No cookie found. Paste your Cookie header into scripts/cookies.1688.txt or set C1688_COOKIES in the environment.');
    process.exit(2);
  }
  const term = encodeURIComponent('袜子');
  const desktopUrl = `https://s.1688.com/selloffer/offer_search.htm?keywords=${term}&n=y`;
  const mobileUrl = `https://m.1688.com/offer_search/-${term}.html`;
  const desktopUA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36';
  const mobileUA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1';

  console.log('Verifying C1688 cookies…');
  const d = await check(desktopUrl, cookie, desktopUA).catch(() => ({ blocked: true, offerAnchors: 0, status: 0 }));
  const m = await check(mobileUrl, cookie, mobileUA).catch(() => ({ blocked: true, offerAnchors: 0, status: 0 }));
  console.log(`Desktop: ${d.blocked ? 'BLOCKED' : 'OK'} (status ${d.status}, offers ~${d.offerAnchors})`);
  console.log(`Mobile:  ${m.blocked ? 'BLOCKED' : 'OK'} (status ${m.status}, offers ~${m.offerAnchors})`);
  if (!d.blocked || !m.blocked) {
    console.log('Cookies look valid for at least one endpoint. Proceed to ingest.');
    process.exit(0);
  } else {
    console.log('Both endpoints blocked. Refresh cookies from Chrome (ensure you can see results on both s.1688.com and m.1688.com).');
    process.exit(1);
  }
})();
