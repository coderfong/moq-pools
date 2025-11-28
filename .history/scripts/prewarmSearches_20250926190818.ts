const BASE = process.env.PREWARM_BASE_URL || 'http://localhost:3007';
const QUERIES = (process.env.PREWARM_QUERIES || 'sleeves,tshirt,socks,bag,phone case').split(',').map(s => s.trim());
const PLATFORMS = (process.env.PREWARM_PLATFORMS || 'ALL').split(',').map(s => s.trim().toUpperCase());

async function prewarmOne(q: string, platform: string) {
  const url = `${BASE}/api/external/aggregate?platform=${encodeURIComponent(platform)}&q=${encodeURIComponent(q)}&limit=180`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${platform} ${q} ${res.status}`);
  const data = await res.json();
  console.log(`Prewarmed ${platform}:${q} -> ${data.total} items`);
}

(async () => {
  for (const q of QUERIES) {
    for (const p of PLATFORMS) {
      try { await prewarmOne(q, p); } catch (e) { console.warn('prewarm failed', p, q, e); }
    }
  }
})();
