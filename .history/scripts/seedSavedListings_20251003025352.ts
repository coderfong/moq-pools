import { PrismaClient, SourcePlatform } from '@prisma/client';

const prisma = new PrismaClient();

type SeedItem = {
  platform: SourcePlatform;
  url: string;
  title: string;
  image?: string;
  priceRaw?: string;
  currency?: string;
  moqRaw?: string;
  moq?: number | null;
  storeName?: string;
  description?: string;
  categories?: string[];
  terms?: string[];
  ratingRaw?: string;
  ordersRaw?: string;
};

// Simple, offline-friendly fixtures to quickly populate SavedListing
// Uses images that already exist under /public to avoid external fetches
const FIXTURES: SeedItem[] = [
  {
    platform: 'ALIBABA',
    url: 'https://example.com/listing/sleeves-100pcs',
    title: 'Photocard Sleeves (100 pcs)',
    image: '/seed/sleeves.jpg',
    priceRaw: 'US$1.50',
    currency: 'USD',
    moqRaw: 'MOQ 1000 pcs',
    moq: 1000,
    storeName: 'Shenzhen Good Factory',
    description: 'Ultra-clear OPP sleeves 66x91mm for cards.',
    categories: ['stationery', 'kpop-merch'],
    terms: ['sleeves','opp','photocard'],
    ratingRaw: '4.8',
    ordersRaw: '1,200 orders',
  },
  {
    platform: 'C1688',
    url: 'https://example.com/listing/pet-crate',
    title: 'Foldable Metal Pet Crate',
    image: '/cache/68824b8f136040fa2057a22ed17da3129fa10d0a.jpg',
    priceRaw: '￥120 - ￥180',
    currency: 'CNY',
    moqRaw: '最小起订量 50',
    moq: 50,
    storeName: 'Hangzhou Pet Co.',
    description: 'Sturdy foldable crate with removable tray.',
    categories: ['pet-supplies'],
    terms: ['dog','crate','pet'],
    ratingRaw: '4.6',
    ordersRaw: '780 orders',
  },
  {
    platform: 'ALIBABA',
    url: 'https://example.com/listing/cotton-tshirt',
    title: '100% Cotton Blank T‑Shirt',
    image: '/cache/66143208a81c6447225c8b59e76f297a8ef959a1.jpg',
    priceRaw: 'US$2.10 - 3.50',
    currency: 'USD',
    moqRaw: 'MOQ 100 pcs',
    moq: 100,
    storeName: 'Guangzhou Apparel',
    description: 'Classic crew neck tees, multiple colors.',
    categories: ['apparel'],
    terms: ['tshirt','cotton','blank'],
  },
  {
    platform: 'C1688',
    url: 'https://example.com/listing/reusable-bag',
    title: 'Non‑woven Reusable Shopping Bag',
    image: '/cache/60518b2610f5b2663634628ba8cd6079b0e74b73.jpg',
    priceRaw: '￥1.20 - ￥2.00',
    currency: 'CNY',
    moqRaw: '起订 500',
    moq: 500,
    storeName: 'Wenzhou Eco Bags',
    description: 'Custom logo available, multiple sizes.',
    categories: ['home-garden'],
    terms: ['bag','reusable','nonwoven'],
  },
  {
    platform: 'ALIBABA',
    url: 'https://example.com/listing/socks-bulk',
    title: 'Breathable Ankle Socks (Bulk)',
    image: '/cache/3ac4bec75cfc9c1e5d352b68f0cb5f125bac9ec3.jpg',
    priceRaw: 'US$0.50 - 0.90',
    currency: 'USD',
    moqRaw: 'MOQ 300 pairs',
    moq: 300,
    storeName: 'Ningbo Hosiery',
    description: 'Cotton blend low-cut socks for daily wear.',
    categories: ['apparel'],
    terms: ['socks','ankle','cotton'],
  },
];

async function main() {
  let upserts = 0;
  for (const it of FIXTURES) {
    await prisma.savedListing.upsert({
      where: { url: it.url },
      create: {
        platform: it.platform,
        url: it.url,
        title: it.title,
        image: it.image ?? null,
        priceRaw: it.priceRaw ?? null,
        currency: it.currency ?? null,
        priceMin: null, // let API parse dynamically when needed
        moqRaw: it.moqRaw ?? null,
        moq: (it.moq ?? null) as any,
        storeName: it.storeName ?? null,
        description: it.description ?? null,
        categories: (it.categories ?? []) as any,
        terms: (it.terms ?? []) as any,
        ratingRaw: it.ratingRaw ?? null,
        ordersRaw: it.ordersRaw ?? null,
      },
      update: {
        title: it.title,
        image: it.image ?? undefined,
        priceRaw: it.priceRaw ?? undefined,
        currency: it.currency ?? undefined,
        moqRaw: it.moqRaw ?? undefined,
        moq: (it.moq ?? undefined) as any,
        storeName: it.storeName ?? undefined,
        description: it.description ?? undefined,
        categories: (it.categories ?? undefined) as any,
        terms: (it.terms ?? undefined) as any,
        ratingRaw: it.ratingRaw ?? undefined,
        ordersRaw: it.ordersRaw ?? undefined,
      }
    });
    upserts++;
  }

  const count = await prisma.savedListing.count();
  console.log(`Seeded ${upserts} SavedListing items. Total now: ${count}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
