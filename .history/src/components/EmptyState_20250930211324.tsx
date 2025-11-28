import Link from 'next/link';

export default function EmptyState({ title = 'Nothing here yet', subtitle = 'Try adjusting filters or search terms.', actionHref = '/products', actionLabel = 'Browse products' }: { title?: string; subtitle?: string; actionHref?: string; actionLabel?: string; }) {
  return (
    <div className="w-full flex flex-col items-center justify-center text-center py-16">
      <div className="text-2xl font-semibold text-ink">{title}</div>
      <div className="mt-2 text-muted">{subtitle}</div>
      <Link href={actionHref} className="mt-4 inline-flex items-center justify-center rounded-full btn-primary-gradient px-4 py-2 text-white shadow-card">{actionLabel}</Link>
    </div>
  );
}
