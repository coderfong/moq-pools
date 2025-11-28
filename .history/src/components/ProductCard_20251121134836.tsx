"use client";
import Link from 'next/link';
import { motion } from 'framer-motion';
import CountdownChip from '@/components/CountdownChip';
import Progress from '@/components/ui/Progress';
import PlatformBadge from '@/components/PlatformBadge';
import { hoverCard, item } from '@/lib/motion';

export type ProductCardProps = {
  id: string;
  href: string;
  title: string;
  image?: string | null;
  supplier?: string | null;
  price?: number | null;
  currency?: string | null;
  progressPct?: number;
  deadline?: string | number | Date;
  sourceCode?: string | null;
};

export default function ProductCard({ id, href, title, image, supplier, price, currency, progressPct = 0, deadline, sourceCode }: ProductCardProps) {
  return (
    <motion.div variants={hoverCard} initial="rest" whileHover="hover" animate="rest" className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-card">
      <Link href={href} className="block">
        <div className="aspect-video bg-gray-100 rounded-t-2xl overflow-hidden">
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={image} alt={title} className="w-full h-full object-cover" />
          ) : null}
        </div>
        <div className="p-3">
          {supplier ? <div className="text-[11px] text-gray-600 dark:text-gray-400 truncate">{supplier}</div> : null}
          <div className="font-medium text-sm mt-0.5 text-gray-900 dark:text-gray-100 line-clamp-4">{title}</div>
          <div className="mt-1 text-sm">
            {price != null && currency ? (
              <span>
                {price} {currency} / unit
              </span>
            ) : (
              <span className="text-muted">See listing</span>
            )}
          </div>
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-2">
              {sourceCode ? <PlatformBadge code={sourceCode} /> : null}
              {deadline ? <CountdownChip deadline={deadline} /> : null}
            </div>
            {typeof progressPct === 'number' ? <span className="text-[11px] text-gray-700 dark:text-gray-300">{progressPct}%</span> : null}
          </div>
          {typeof progressPct === 'number' ? (
            <div className="mt-1">
              <Progress value={progressPct} />
            </div>
          ) : null}
          <div className="mt-3 flex items-center gap-2">
            <a href={href} className="flex-1 inline-flex items-center justify-center rounded-full font-medium btn-mag btn-primary-gradient shadow-card hover:shadow-lg text-xs px-4 py-2 whitespace-nowrap">
              Join Pool
            </a>
            <a href={href} className="text-xs px-4 py-2 rounded-full border border-gray-200 hover:bg-gray-50 whitespace-nowrap">
              Details
            </a>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
