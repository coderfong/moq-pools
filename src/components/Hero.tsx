"use client";

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import HeroCarousel from '@/components/HeroCarousel';
import Link from 'next/link';

type ExternalItem = { title: string; image: string; price: string; url: string };

// Helper function to clean HTML from titles
function cleanTitle(title: string): string {
  if (!title) return '';
  
  // Remove HTML tags
  const withoutTags = title.replace(/<[^>]*>/g, '');
  
  // Decode HTML entities
  const decoded = withoutTags
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
  
  // Clean up extra whitespace and truncate if needed
  const cleaned = decoded
    .replace(/\s+/g, ' ')
    .trim();
  
  // Truncate long titles
  return cleaned.length > 80 ? cleaned.substring(0, 77) + '...' : cleaned;
}

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
      if (process.env.NODE_ENV !== 'production') {
        console.log('🔍 Fetching featured listings...');
      }
      const listingsRes = await fetch('/api/listings/featured?platform=ALL&limit=12', { cache: 'no-store' });
      
      if (listingsRes.ok) {
        const json = await listingsRes.json();
        const items = Array.isArray(json.items) ? json.items : [];
        
        if (process.env.NODE_ENV !== 'production') {
          console.log('✅ Fetched listings:', items.length);
        }
        
        if (items.length > 0) {
          const mapped = items.slice(0, 10).map((item: any, idx: number) => {
            // Mock progress for carousel display
            const progress = 40 + (idx * 17) % 55;
            
            // Format price from savedListing data
            let formattedPrice = '';
            if (item.unitPrice && item.currency) {
              const currency = item.currency === 'USD' ? '$' : item.currency === 'CNY' ? '¥' : item.currency;
              formattedPrice = `${currency}${item.unitPrice}`;
            } else if (item.price) {
              formattedPrice = item.price;
            }
            
            // Format MOQ from savedListing data
            let formattedMoq = 'Building pool';
            if (item.moqQty && item.moqQty > 1) {
              formattedMoq = `MOQ: ${item.moqQty}`;
            } else if (item.moq) {
              formattedMoq = item.moq;
            }
            
            return {
              title: cleanTitle(item.title) || 'Featured Product',
              image: item.image || RANDOM_LISTING_IMAGES[idx % RANDOM_LISTING_IMAGES.length],
              price: formattedPrice,
              url: `/pools/${item.id || '#'}`, // Link to pool page instead of external URL
              moq: formattedMoq,
              progress,
              storeName: item.supplierName || '',
              platform: item.platform || '',
            };
          });
          
          if (process.env.NODE_ENV !== 'production') {
            console.log('📦 Using featured listings:', mapped.length);
          }
          setFeed(mapped);
          setLoading(false);
          return;
        }
      }
      
      // Fallback: Try pools API
      if (process.env.NODE_ENV !== 'production') {
        console.log('🔍 Falling back to pools API...');
      }
      const poolsRes = await fetch('/api/pools?status=OPEN&limit=10', { cache: 'no-store' });
      
      if (poolsRes.ok) {
        const json = await poolsRes.json();
        const pools = Array.isArray(json.pools) ? json.pools : [];
        
        if (process.env.NODE_ENV !== 'production') {
          console.log('✅ Fetched pools:', pools.length);
        }
        
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
              title: cleanTitle(product?.title) || 'Featured Product',
              image: firstImage,
              price: product?.unitPrice ? `$${product.unitPrice}` : '',
              url: `/pools/${pool.id}`,
              moq: `${pool.pledgedQty}/${pool.targetQty} orders`,
              progress,
              poolId: pool.id,
            };
          });
          
          if (process.env.NODE_ENV !== 'production') {
            console.log('📦 Using pool data as fallback');
          }
          setFeed(mapped);
          setLoading(false);
          return;
        }
      }
      
      // Last resort: static fallback
      if (process.env.NODE_ENV !== 'production') {
        console.log('⚠️ All APIs failed, using fallback');
      }
      setFeed([]);
    } catch (err) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('💥 Failed to load listings:', err);
      }
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
      {/* Enhanced animated gradient blobs with better animation */}
      <div className="absolute inset-0 overflow-hidden opacity-30">
        <div className="absolute -top-40 -right-40 w-[500px] h-[500px] bg-gradient-to-br from-orange-300 to-orange-200 rounded-full mix-blend-multiply filter blur-3xl animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] bg-gradient-to-br from-amber-300 to-amber-200 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gradient-to-br from-pink-300 to-pink-200 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-4000"></div>
      </div>

      {/* Grid pattern overlay */}
      <div className="absolute inset-0 bg-grid-pattern opacity-[0.02]"></div>

      <div className="relative container mx-auto px-4 sm:px-6 py-6 sm:py-8 md:py-12 lg:py-14">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-10 lg:gap-16 items-center">
          {/* Left column: Content */}
          <div className="flex flex-col justify-center animate-fade-in-up">
            <div className="space-y-3 sm:space-y-4 md:space-y-5 lg:space-y-6">
              {/* Enhanced Badge with animation */}
              <div className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 md:px-5 py-1.5 sm:py-2 md:py-2.5 rounded-full bg-white/80 backdrop-blur-md border border-orange-200/50 shadow-lg sm:shadow-xl w-fit hover:shadow-2xl hover:scale-105 transition-all duration-300 group">
                <div className="relative">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="sm:w-5 sm:h-5 text-orange-600 group-hover:scale-110 transition-transform">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                    <circle cx="9" cy="7" r="4"></circle>
                    <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                  </svg>
                  <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 sm:w-2 sm:h-2 bg-green-500 rounded-full animate-pulse"></span>
                </div>
                <span className="text-xs sm:text-sm font-semibold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
                  Join 10,000+ Smart Buyers
                </span>
              </div>

              {/* Enhanced Heading with better typography */}
              <h1 className="font-display text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold leading-[1.15] sm:leading-[1.1] text-gray-900 tracking-tight">
                Buy Together.{' '}
                <span className="relative inline-block mt-1 sm:mt-2">
                  <span className="relative z-10 bg-gradient-to-r from-orange-600 via-orange-500 to-amber-500 bg-clip-text text-transparent animate-gradient-x">
                    Save Big.
                  </span>
                  <span className="absolute bottom-1 sm:bottom-2 left-0 w-full h-2 sm:h-3 md:h-4 bg-gradient-to-r from-orange-400/30 to-amber-400/30 -z-0 transform -skew-x-12"></span>
                  <svg className="hidden sm:block absolute -right-6 md:-right-8 -top-3 md:-top-4 w-8 h-8 md:w-10 md:h-10 text-orange-400 opacity-20 animate-bounce-slow" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                  </svg>
                </span>
              </h1>

              {/* Enhanced Description */}
              <p className="text-sm sm:text-base text-gray-900 max-w-xl leading-relaxed font-medium">
                Join buyers pooling orders to meet factory minimums. Get <span className="text-orange-600 font-semibold">wholesale prices</span> on the exact quantity you need—no bulk buying required.
              </p>

              {/* Enhanced CTA Buttons with better hover effects */}
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-2 sm:pt-3">
                <Link 
                  href="#pools" 
                  className="group relative inline-flex items-center justify-center gap-1.5 sm:gap-2 bg-gradient-to-r from-orange-500 via-orange-600 to-orange-500 bg-size-200 bg-pos-0 hover:bg-pos-100 text-white px-5 sm:px-6 md:px-7 py-2.5 sm:py-3 md:py-3.5 rounded-lg sm:rounded-xl font-semibold text-sm sm:text-base shadow-lg sm:shadow-xl hover:shadow-2xl hover:shadow-orange-500/50 transition-all duration-300 hover:scale-105 overflow-hidden"
                >
                  <span className="relative z-10 flex items-center gap-1.5 sm:gap-2">
                    Browse Active Pools
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform">
                      <path d="M5 12h14"></path>
                      <path d="m12 5 7 7-7 7"></path>
                    </svg>
                  </span>
                  <div className="absolute inset-0 -z-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 transform -skew-x-12 group-hover:translate-x-full transition-transform duration-1000"></div>
                </Link>
                <Link 
                  href="#how-it-works" 
                  className="group inline-flex items-center justify-center gap-1.5 sm:gap-2 bg-white/90 backdrop-blur-sm text-gray-900 px-5 sm:px-6 md:px-7 py-2.5 sm:py-3 md:py-3.5 rounded-lg sm:rounded-xl font-semibold text-sm sm:text-base border-2 border-gray-200 hover:border-orange-500 hover:bg-orange-50 transition-all duration-300 shadow-md sm:shadow-lg hover:shadow-xl hover:scale-105"
                >
                  <span>How It Works</span>
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="sm:w-5 sm:h-5 opacity-50 group-hover:opacity-100 transition-opacity">
                    <circle cx="12" cy="12" r="10"></circle>
                    <polygon points="10 8 16 12 10 16 10 8"></polygon>
                  </svg>
                </Link>
              </div>

              {/* Enhanced Stats with counters */}
              <div className="flex flex-wrap items-center gap-2 sm:gap-3 md:gap-4 lg:gap-5 pt-2 sm:pt-3 md:pt-4">
                <div className="group bg-white/90 backdrop-blur-md px-3 sm:px-4 md:px-5 py-2 sm:py-2.5 md:py-3 rounded-xl sm:rounded-2xl border border-gray-100 shadow-md sm:shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 hover:border-orange-200">
                  <div className="text-lg sm:text-xl md:text-2xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
                    $2.5M+
                  </div>
                  <div className="text-[10px] sm:text-xs text-gray-600 font-semibold uppercase tracking-wide">Saved Together</div>
                </div>
                <div className="group bg-white/90 backdrop-blur-md px-3 sm:px-4 md:px-5 py-2 sm:py-2.5 md:py-3 rounded-xl sm:rounded-2xl border border-gray-100 shadow-md sm:shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 hover:border-orange-200">
                  <div className="text-lg sm:text-xl md:text-2xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
                    500+
                  </div>
                  <div className="text-[10px] sm:text-xs text-gray-600 font-semibold uppercase tracking-wide">Active Pools</div>
                </div>
                <div className="group bg-white/90 backdrop-blur-md px-3 sm:px-4 md:px-5 py-2 sm:py-2.5 md:py-3 rounded-xl sm:rounded-2xl border border-gray-100 shadow-md sm:shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 hover:border-orange-200">
                  <div className="text-lg sm:text-xl md:text-2xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
                    98%
                  </div>
                  <div className="text-[10px] sm:text-xs text-gray-600 font-semibold uppercase tracking-wide">Success Rate</div>
                </div>
              </div>
            </div>

            {/* Enhanced Search Form with better focus states */}
            <form onSubmit={onSearch} className="mt-4 sm:mt-6 md:mt-8 lg:mt-10 max-w-xl">
              <div className="relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-orange-400 to-amber-400 rounded-2xl opacity-0 group-focus-within:opacity-20 blur transition-all duration-300"></div>
                <div className="relative flex items-stretch gap-1 sm:gap-2 bg-white rounded-xl sm:rounded-2xl shadow-lg sm:shadow-xl p-1.5 sm:p-2 border border-gray-200 group-focus-within:border-orange-300 transition-all">
                  <div className="flex items-center pl-2 sm:pl-3 md:pl-4 text-gray-400">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="sm:w-5 sm:h-5">
                      <circle cx="11" cy="11" r="8"></circle>
                      <path d="m21 21-4.35-4.35"></path>
                    </svg>
                  </div>
                  <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    className="flex-1 rounded-lg sm:rounded-xl px-2 sm:px-3 py-2 sm:py-2.5 md:py-3 lg:py-3.5 text-sm sm:text-base text-gray-900 placeholder:text-gray-400 focus:outline-none bg-transparent"
                    placeholder="Search products..."
                  />
                  <button 
                    type="submit"
                    className="rounded-lg sm:rounded-xl px-3 sm:px-4 md:px-5 lg:px-6 py-2 sm:py-2.5 md:py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold hover:from-orange-600 hover:to-orange-700 transition-all shadow-md sm:shadow-lg hover:shadow-xl hover:scale-105 text-sm sm:text-base whitespace-nowrap"
                  >
                    Search
                  </button>
                </div>
              </div>
              
              {/* Enhanced Trending tags */}
              <div className="mt-3 sm:mt-4 md:mt-5 flex flex-wrap items-center gap-1.5 sm:gap-2">
                <span className="text-xs sm:text-sm text-gray-500 font-semibold flex items-center gap-1">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="sm:w-4 sm:h-4 text-orange-500">
                    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
                    <polyline points="17 6 23 6 23 12"></polyline>
                  </svg>
                  Trending:
                </span>
                {['keyboard kit', 'artisan keycaps', 'desk mat', 'switch lubing kit'].map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setQ(t)}
                    className="px-2.5 sm:px-3 md:px-4 py-1.5 sm:py-2 rounded-full bg-white/80 backdrop-blur-sm text-gray-700 hover:bg-gradient-to-r hover:from-orange-50 hover:to-amber-50 hover:text-orange-600 hover:border-orange-300 text-xs sm:text-sm font-medium border border-gray-200 transition-all shadow-sm hover:shadow-md hover:scale-105"
                  >
                    {t}
                  </button>
                ))}
              </div>
            </form>
          </div>

          {/* Right column: Enhanced Carousel */}
          <div className="order-first lg:order-none flex items-center justify-center lg:justify-end animate-fade-in-up animation-delay-300">
            <div className="relative w-full max-w-[500px] px-0">
              {/* Enhanced glow effect with multiple layers */}
              <div className="absolute inset-0 bg-gradient-to-br from-orange-400/30 via-amber-400/20 to-pink-400/30 rounded-2xl sm:rounded-3xl blur-2xl sm:blur-3xl -z-10 animate-pulse-slow"></div>
              <div className="absolute inset-0 bg-gradient-to-tl from-orange-300/20 to-amber-300/20 rounded-2xl sm:rounded-3xl blur-xl sm:blur-2xl -z-10"></div>
              <HeroCarousel items={slides} className="relative w-full h-[280px] sm:h-[350px] md:h-[400px] lg:h-[450px] shadow-xl sm:shadow-2xl rounded-xl sm:rounded-2xl" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
