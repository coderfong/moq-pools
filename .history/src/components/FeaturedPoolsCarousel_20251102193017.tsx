"use client";
import Link from 'next/link';
import Progress from '@/components/ui/Progress';

type Item = {
  id: string;
  href: string;
  title: string;
  image?: string | null;
  supplier?: string | null;
  price?: number | null;
  currency?: string | null;
  progressPct?: number;
};

export default function FeaturedPoolsCarousel({ items }: { items: Item[] }) {
  if (!items?.length) return null;
  return (
    <section className="w-screen max-w-none -mx-6 md:-mx-10 xl:-mx-16" data-reveal>
      <div className="px-6 md:px-10 xl:px-16 py-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-xl md:text-2xl font-extrabold tracking-tight">Featured pools</h2>
          <div className="text-sm text-muted dark:text-gray-400">Top picks nearing MOQ</div>
        </div>
        <div className="relative">
          <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-2 no-scrollbar">
            {items.map((p) => (
              <Link
                key={p.id}
                href={p.href}
                className="min-w-[260px] max-w-[260px] snap-start rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-card transition tilt-hover"
              >
                <div className="aspect-video bg-gray-100 rounded-t-2xl overflow-hidden">
                  {p.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.image} alt={p.title} className="w-full h-full object-cover" />
                  ) : null}
                </div>
                <div className="p-3">
                  {p.supplier ? <div className="text-[11px] text-gray-600 dark:text-gray-400 truncate">{p.supplier}</div> : null}
                  <div className="font-medium text-sm mt-0.5 text-gray-900 dark:text-gray-100">{p.title}</div>
                  <div className="mt-1 text-sm">
                    {p.price != null && p.currency ? (
                      <span>
                        {p.price} {p.currency} / unit
                      </span>
                    ) : (
                      <span className="text-muted">See listing</span>
                    )}
                  </div>
                  {typeof p.progressPct === 'number' ? (
                    <div className="mt-2">
                      <div className="flex items-center justify-between text-[11px] text-gray-700 dark:text-gray-300">
                        <span>{p.progressPct}%</span>
                        <span>MOQ</span>
                      </div>
                      <Progress value={p.progressPct} label="Pool progress" />
                    </div>
                  ) : null}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
