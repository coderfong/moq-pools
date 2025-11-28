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
      // First try to fetch featured listings from SavedListing table
      console.log('🔍 Fetching featured listings...');
      const listingsRes = await fetch('/api/listings/featured?platform=ALL&limit=12', { cache: 'no-store' });
      
      if (listingsRes.ok) {
        const json = await listingsRes.json();
        const items = Array.isArray(json.items) ? json.items : [];
        
        console.log('✅ Fetched listings:', items.length);
        
        if (items.length > 0) {
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
          
          console.log('📦 Using featured listings');
          setFeed(mapped);
          setLoading(false);
          return;
        }
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
    <section className="relative overflow-hidden w-full bg-gradient-to-br from-orange-50 via-white to-amber-50">
      {/* Animated gradient blobs background */}
      <div className="absolute inset-0 overflow-hidden opacity-40">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-orange-200 rounded-full mix-blend-multiply filter blur-3xl animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-amber-200 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-pink-200 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-4000"></div>
      </div>

      <div className="relative container mx-auto px-4 md:px-6 lg:px-8 xl:px-16 py-8 md:py-12 lg:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          {/* Left column: Content */}
          <div className="flex flex-col justify-center">
            <div className="space-y-4 md:space-y-6">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-orange-500/10 to-amber-500/10 border border-orange-500/20 backdrop-blur-sm shadow-lg w-fit">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-orange-600">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                  <circle cx="9" cy="7" r="4"></circle>
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                </svg>
                <span className="text-sm font-semibold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
                  Join 10,000+ Smart Buyers
                </span>
              </div>

              {/* Heading */}
              <h1 className="font-display text-4xl lg:text-5xl xl:text-6xl font-bold leading-[1.1] text-gray-900">
                Pool Orders,{' '}
                <span className="relative inline-block">
                  <span className="relative z-10 bg-gradient-to-r from-orange-600 via-orange-500 to-amber-500 bg-clip-text text-transparent">
                    Unlock Savings
                  </span>
                  <span className="absolute bottom-2 left-0 w-full h-3 bg-gradient-to-r from-orange-400/30 to-amber-400/30 -z-0"></span>
                </span>
              </h1>

              {/* Description */}
              <p className="text-base md:text-lg text-gray-600 max-w-xl leading-relaxed">
                Meet minimum order quantities together. Access wholesale prices without buying in bulk.
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 pt-2">
                <Link 
                  href="#pools" 
                  className="group inline-flex items-center justify-center gap-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white px-8 py-4 rounded-xl font-semibold text-base shadow-lg hover:shadow-xl hover:shadow-orange-500/40 transition-all duration-200 hover:scale-105"
                >
                  Browse Active Pools
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 group-hover:translate-x-1 transition-transform">
                    <path d="M5 12h14"></path>
                    <path d="m12 5 7 7-7 7"></path>
                  </svg>
                </Link>
                <Link 
                  href="#how-it-works" 
                  className="inline-flex items-center justify-center gap-2 bg-white text-gray-900 px-8 py-4 rounded-xl font-semibold text-base border-2 border-gray-200 hover:border-orange-500 hover:bg-orange-50 transition-all duration-200 shadow-md hover:shadow-lg"
                >
                  How It Works
                </Link>
              </div>

              {/* Stats */}
              <div className="flex flex-wrap items-center gap-4 md:gap-6 pt-2">
                <div className="bg-white/80 backdrop-blur-sm px-3 py-2 rounded-xl border border-gray-100 shadow-md">
                  <div className="text-xl md:text-2xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
                    $2.5M+
                  </div>
                  <div className="text-xs text-gray-600 font-medium">Saved Together</div>
                </div>
                <div className="bg-white/80 backdrop-blur-sm px-3 py-2 rounded-xl border border-gray-100 shadow-md">
                  <div className="text-xl md:text-2xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
                    500+
                  </div>
                  <div className="text-xs text-gray-600 font-medium">Active Pools</div>
                </div>
                <div className="bg-white/80 backdrop-blur-sm px-3 py-2 rounded-xl border border-gray-100 shadow-md">
                  <div className="text-xl md:text-2xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
                    98%
                  </div>
                  <div className="text-xs text-gray-600 font-medium">Success Rate</div>
                </div>
              </div>
            </div>

            {/* Search Form */}
            <form onSubmit={onSearch} className="mt-6 lg:mt-8 max-w-xl">
              <div className="flex items-stretch gap-3 bg-white rounded-2xl shadow-lg p-2 border border-gray-100">
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  className="flex-1 rounded-xl px-4 py-3 text-base md:text-lg text-gray-900 placeholder:text-gray-400 focus:outline-none bg-transparent"
                  placeholder="Search products, suppliers, categories…"
                />
                <button 
                  type="submit"
                  className="rounded-xl px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold hover:from-orange-600 hover:to-orange-700 transition-all shadow-md hover:shadow-lg text-base md:text-lg"
                >
                  Search
                </button>
              </div>
              
              {/* Trending tags */}
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="text-sm text-gray-600 font-medium">Trending:</span>
                {['keyboard kit', 'artisan keycaps', 'desk mat', 'switch lubing kit'].map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setQ(t)}
                    className="px-4 py-2 rounded-full bg-white text-gray-700 hover:bg-orange-50 hover:text-orange-600 hover:border-orange-300 text-sm font-medium border border-gray-200 transition-all shadow-sm hover:shadow-md"
                  >
                    {t}
                  </button>
                ))}
              </div>
            </form>
          </div>

          {/* Right column: Carousel */}
          <div className="order-first lg:order-none flex items-center justify-center lg:justify-end">
            <div className="relative w-full max-w-[450px] px-4 lg:px-0">
              {/* Glow effect behind carousel */}
              <div className="absolute inset-0 bg-gradient-to-r from-orange-400/20 to-amber-400/20 rounded-3xl blur-3xl -z-10"></div>
              <HeroCarousel items={slides} className="relative w-full h-[350px] md:h-[400px] lg:h-[420px]" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
