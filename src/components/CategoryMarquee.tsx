import Link from 'next/link';
import { CATEGORIES, ICONS } from '@/lib/categories';

export default function CategoryMarquee() {
  const cats = CATEGORIES;
  // two passes, then duplicate the rendered list for seamless marquee
  const list = [...cats, ...cats];
  const href = (term: string) => `/products?platform=ALL&q=${encodeURIComponent(term)}&per=50&page=1`;
  return (
    <section className="w-screen max-w-none -mx-6 md:-mx-10 xl:-mx-16" data-reveal>
      <div className="px-6 md:px-10 xl:px-16 py-5 overflow-hidden group">
        <div className="flex items-center gap-5 whitespace-nowrap marquee group-hover:[animation-play-state:paused] motion-reduce:animate-none text-base md:text-lg">
          {list.map((c, i) => {
            const Icon = ICONS[c.key];
            return (
              <Link key={`a-${i}`} href={href(c.term)} className="px-5 py-2.5 rounded-full border-hairline bg-white/80 dark:bg-gray-900/80 backdrop-blur text-gray-900 dark:text-white inline-flex items-center gap-3 hover:bg-white/90 dark:hover:bg-gray-900/90">
                {Icon ? <Icon className="h-4 w-4 md:h-5 md:w-5" /> : null}
                <span>{c.shortLabel}</span>
              </Link>
            );
          })}
          {/* duplicate for continuous loop */}
          {list.map((c, i) => {
            const Icon = ICONS[c.key];
            return (
              <Link aria-hidden tabIndex={-1} key={`b-${i}`} href={href(c.term)} className="px-5 py-2.5 rounded-full border-hairline bg-white/80 dark:bg-gray-900/80 backdrop-blur text-gray-900 dark:text-white inline-flex items-center gap-3 hover:bg-white/90 dark:hover:bg-gray-900/90">
                {Icon ? <Icon className="h-4 w-4 md:h-5 md:w-5" /> : null}
                <span>{c.shortLabel}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
