"use client";

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import HeroCarousel from '@/components/HeroCarousel';
import Link from 'next/link';

type ExternalItem = { title: string; image: string; price: string; url: string };

export default function Hero() {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [tab, setTab] = useState<'ALIBABA' | 'C1688' | 'MADE_IN_CHINA' | 'INDIAMART'>('ALIBABA');
  const [feed, setFeed] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Deterministic curated subset of product images available under /public/cache
  // Use filenames that exist to avoid 404s
  const RANDOM_LISTING_IMAGES = useMemo(
    () => [
      '/cache/e186fc621035f4c6919ede962d2ae332433908a4.webp',
      '/cache/e189a0b8652e56a67b57cb4d8e6d8cdf3c5b2ec3.webp',
      '/cache/e196bdf6eca09f8148c4c505cbeb1986b142f9e1.webp',
      '/cache/e19d286f7a0cd2c4552d013deb72c4e5c46255c3.jpg',
      '/cache/e1c9822dff934fd3f894a4de5f07a3099acc9ff9.jpg',
      '/cache/e1efd3cc08171046b93eb971cdb5eb5281dd2df5.jpg',
      '/cache/e215b10d4e0df8ea020639bb3c790735e85510a8.jpg',
      '/cache/e2346b759f330a34be43374357814b2a495ac355.jpg',
      '/cache/e237a5bedea16ef6e9f264192bd9bd3a1c65a36c.jpg',
      '/cache/e24c86833939ac9788ef827387f0e23f60d31c2d.jpg',
      '/cache/e2552bcf548301c75a870392ea6ecc98970ceac3.jpg',
      '/cache/e2580e9648bccf82a149964883be1b0002327e52.jpg',
      '/cache/e2b7fab3b2c9ef085b2503b8d09d46c7ef0be148.jpg',
      '/cache/e2d85d7ec14731cc3a1427124ca34ed5e6aaec0c.jpg',
      '/cache/e2f4d30d9d7a0b4ab9e438072a768f6878c3c28e.jpg',
      '/cache/e30dcd167f58a9dd87b4487c6c8a6080ea920a83.jpg',
      '/cache/e310b754a398e127d34b540fcd321842a4fae7ce.jpg',
      '/cache/e3bf692f7e9cc1c0e23d9478fa1aba99111a2161.jpg',
      '/cache/e3d4ddcfec43593a932141e83ef3c2b18916526d.jpg',
      '/cache/e3f40a63916d697ea46ee5d9fff546dae29c9005.jpg',
    ],
    []
  );

  // Deterministic carousel items: take the first 10 images as-is
  const FRAMER_CAROUSEL = useMemo(() => {
    const imgs = RANDOM_LISTING_IMAGES.slice(0, 10);
    return imgs.map((src, i) => ({
      image: src,
      title: `Featured listing #${i + 1}`,
    }));
  }, [RANDOM_LISTING_IMAGES]);

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const term = q.trim();
    router.push(term ? `/products?q=${encodeURIComponent(term)}` : '/products');
  };

  // Fetch real active pools for the carousel
  async function loadActivePools() {
    setLoading(true);
    try {
      // Fetch from the same API that the products page uses
      console.log('🔍 Fetching listings from /api/external/aggregate...');
      const usp = new URLSearchParams();
      usp.set('platform', 'ALL');
      usp.set('limit', '12');
      usp.set('headless', '0');
      
      const productsRes = await fetch(`/api/external/aggregate?${usp.toString()}`, { cache: 'no-store' });
      
      if (productsRes.ok) {
        const json = await productsRes.json();
        const items = Array.isArray(json.items) ? json.items : [];
        
        console.log('✅ Fetched listings:', items.length);
        
        if (items.length === 0) {
          console.log('⚠️ No listings found');
          setFeed([]);
          setLoading(false);
          return;
        }
        
        const mapped = items.slice(0, 10).map((item: any, idx: number) => {
          // Mock progress for carousel display
          const progress = 40 + (idx * 17) % 55;
          
          return {
            title: item.title || 'Featured Product',
            image: item.image || RANDOM_LISTING_IMAGES[idx % RANDOM_LISTING_IMAGES.length],
            price: item.unitPrice ? `${item.unitPrice} ${item.currency || ''}` : '',
            url: item.sourceUrl || '#',
            moq: item.moqQty ? `MOQ: ${item.moqQty}` : 'Building pool',
            progress,
            storeName: item.supplierName || '',
          };
        });
        
        console.log('📦 Using external listings. First item:', {
          title: mapped[0]?.title?.substring(0, 50),
          image: mapped[0]?.image?.substring(0, 50),
          url: mapped[0]?.url?.substring(0, 50),
        });
        setFeed(mapped);
        setLoading(false);
        return;
      } else {
        console.error('❌ External aggregate API failed:', productsRes.status, productsRes.statusText);
      }
      
      // Fallback: Try pools API
      console.log('🔍 Falling back to pools API...');
      const poolsRes = await fetch('/api/pools?status=OPEN&limit=10', { cache: 'no-store' });
      
      if (poolsRes.ok) {
        const json = await poolsRes.json();
        const pools = Array.isArray(json.pools) ? json.pools : [];
        
        console.log('✅ Fetched pools:', pools.length);
        
        if (pools.length > 0) {
          const mapped = pools.map((pool: any) => {
            const product = pool.product;
            let images: string[] = [];
            
            if (product?.imagesJson) {
              try {
                images = typeof product.imagesJson === 'string' 
                  ? JSON.parse(product.imagesJson) 
                  : product.imagesJson;
              } catch {
                images = [];
              }
            }
            
            const firstImage = images[0] || '/cache/e186fc621035f4c6919ede962d2ae332433908a4.webp';
            const progress = pool.targetQty > 0 ? Math.round((pool.pledgedQty / pool.targetQty) * 100) : 0;
            
            return {
              title: product?.title || 'Featured Product',
              image: firstImage,
              price: product?.unitPrice ? `$${product.unitPrice}` : '',
              url: `/pools/${pool.id}`,
              moq: `${pool.pledgedQty}/${pool.targetQty} orders`,
              progress,
              poolId: pool.id,
            };
          });
          
          console.log('📦 Using pool data as fallback');
          setFeed(mapped);
          setLoading(false);
          return;
        }
      }
      
      // Last resort: static fallback
      console.log('⚠️ All APIs failed, using fallback');
      setFeed([]);
    } catch (err) {
      console.error('💥 Failed to load listings:', err);
      setFeed([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadActivePools();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Use the real product feed for the hero carousel if available, fallback to FRAMER_CAROUSEL
  const slides = useMemo(() => {
    if (feed && feed.length > 0) {
      return feed.map((p) => ({
        image: p.image,
        title: p.title,
        href: p.url,
        moq: p.moq,
        price: p.price,
        progress: p.progress,
      }));
    }
    return FRAMER_CAROUSEL.map((x) => ({
      image: x.image,
      title: x.title,
    }));
  }, [feed, FRAMER_CAROUSEL]);

  return (
    <section className="relative overflow-hidden w-full mesh grain" data-reveal>
      <div className="absolute inset-0 opacity-20 mix-blend-overlay pointer-events-none hero-bubbles" />

      <div className="relative container mx-auto px-6 md:px-10 xl:px-16 pt-2 md:pt-4 pb-6 md:pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-12 items-stretch">
          <div className="flex flex-col justify-center">
            <div className="space-y-8 animate-in fade-in slide-in-from-left duration-1000">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
                {/* Users icon */}
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-primary"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M22 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                <span className="text-sm font-medium text-foreground">Join 10,000+ Smart Buyers</span>
              </div>
              <h1 className="font-display text-5xl lg:text-6xl xl:text-7xl font-bold leading-tight text-gray-900">
                Pool Orders, <br />
                <span className="bg-gradient-to-r from-orange-600 to-amber-400 bg-clip-text text-transparent">
                  Unlock Savings
                </span>
              </h1>
              <p className="text-xl text-muted-foreground max-w-xl">
                Meet minimum order quantities together. Access wholesale prices without buying in bulk. Join active pools or start your own.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="#pools" className="inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 bg-primary text-primary-foreground hover:scale-105 shadow-lg hover:shadow-xl transition-all h-11 rounded-md px-8 group">
                  Browse Active Pools
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 group-hover:translate-x-1 transition-transform"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>
                </Link>
                <Link href="#how-it-works" className="inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-11 rounded-md px-8">
                  How It Works
                </Link>
              </div>
              <div className="flex items-center gap-8 pt-4">
                <div>
                  <div className="text-3xl font-bold text-foreground">$2.5M+</div>
                  <div className="text-sm text-muted-foreground">Saved Together</div>
                </div>
                <div className="w-px h-12 bg-border"></div>
                <div>
                  <div className="text-3xl font-bold text-foreground">500+</div>
                  <div className="text-sm text-muted-foreground">Active Pools</div>
                </div>
                <div className="w-px h-12 bg-border"></div>
                <div>
                  <div className="text-3xl font-bold text-foreground">98%</div>
                  <div className="text-sm text-muted-foreground">Success Rate</div>
                </div>
              </div>
            </div>
            {/* Search block: reduced size for cohesion and limited width to content column */}
            <form onSubmit={onSearch} className="mt-6 lg:mt-8 max-w-xl">
              <div className="flex items-stretch gap-3">
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  className="w-full rounded-xl px-4 py-4 text-lg md:text-xl text-gray-900 placeholder:text-gray-500"
                  placeholder="Search products, suppliers, categories…"
                />
                <button className="rounded-xl px-5 py-4 bg-white text-gray-900 font-semibold hover:bg-gray-100 text-lg md:text-xl">Search</button>
              </div>
              <div className="mt-3 md:mt-4 text-base md:text-lg text-gray-900 flex flex-wrap items-center gap-2">
                <span className="text-gray-900">Trending:</span>
                {['keyboard kit', 'artisan keycaps', 'desk mat', 'switch lubing kit'].map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setQ(t)}
                    className="px-4 py-2.5 rounded-full bg-white !text-black hover:bg-gray-100 text-sm md:text-base border border-gray-200"
                  >
                    {t}
                  </button>
                ))}
              </div>
            </form>
          </div>

          {/* Right column: rotating carousel */}
          <div className="order-first lg:order-none flex items-center">
            {/* Reduced size for better balance */}
            <HeroCarousel items={slides} className="mx-auto w-full max-w-[560px] h-[420px] md:h-[480px] lg:h-[520px]" />
          </div>

          {/* Feed preview removed per request */}
        </div>
      </div>
    </section>
  );
}
