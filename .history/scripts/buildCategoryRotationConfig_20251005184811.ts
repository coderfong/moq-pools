import { buildCategoryRotation } from '@/lib/categoryRotation';
import { CATEGORIES } from '@/lib/categories';

function parseArgs(argv: string[]) {
  const out: any = { seed: undefined, platform: 'ALL', perCategory: 6, maxTotal: 0 };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    const [k, vRaw] = a.includes('=') ? a.split(/=(.*)/) : [a, argv[i + 1]];
    const take = () => { if (!a.includes('=')) i++; return vRaw; };
    switch (k) {
      case '--seed': out.seed = Number(take()); break;
      case '--platform': out.platform = String(take() || 'ALL').toUpperCase(); break;
      case '--per-category': out.perCategory = Number(take()); break;
      case '--max-total': out.maxTotal = Number(take()); break;
      case '--include-aliases': out.includeAliases = true; break;
      case '--no-aliases': out.includeAliases = false; break;
      case '--no-featured': out.includeFeatured = false; break;
    }
  }
  return out;
}

async function main() {
  const args = parseArgs(process.argv);
  const seed = Number.isFinite(args.seed) ? args.seed : Math.floor(Date.now() % 1e9);
  const perCategory = Number.isFinite(args.perCategory) ? args.perCategory : 6;
  const maxTotal = Number.isFinite(args.maxTotal) ? args.maxTotal : 0;

  const rotation = buildCategoryRotation({
    seed,
    perCategory,
    includeAliases: args.includeAliases !== false,
    includeFeatured: args.includeFeatured !== false,
  });

  const platform = args.platform || 'ALL';
  const jobs = rotation.map(r => ({ platform, q: r.query, limit: 180 })).slice(0, maxTotal && maxTotal > 0 ? maxTotal : undefined);

  const summary = {
    generatedAt: new Date().toISOString(),
    seed,
    platform,
    categories: CATEGORIES.length,
    jobs,
  };
  process.stdout.write(JSON.stringify(summary, null, 2) + '\n');
}

main().catch(e => { console.error(e); process.exit(1); });
