import ProductCard from '@/components/ProductCard';
import Progress from '@/components/ui/Progress';
import CountdownChip from '@/components/CountdownChip';
import PlatformBadge from '@/components/PlatformBadge';

export default async function PoolDetailPage({ params }: { params: { slug: string } }) {
  const id = params.slug;
  // TODO: Replace with real fetch
  const mock = {
    title: 'Pool detail placeholder',
    supplier: 'Supplier Name',
    price: 12.3,
    currency: 'USD',
    progressPct: 42,
    deadline: Date.now() + 1000 * 60 * 44,
    sourceCode: 'ALIBABA',
    images: ['/seed/sleeves.jpg'],
  };

  return (
    <div className="w-screen max-w-none -mx-6 md:-mx-10 xl:-mx-16">
      <div className="px-6 md:px-10 xl:px-16 py-10 grid grid-cols-1 xl:grid-cols-12 gap-8">
        <div className="xl:col-span-7">
          <div className="aspect-[4/3] bg-gray-100 rounded-2xl overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={mock.images[0]} alt="" className="w-full h-full object-cover" />
          </div>
        </div>
        <div className="xl:col-span-5 space-y-4">
          <div className="flex items-center gap-3">
            <PlatformBadge code={mock.sourceCode} />
            <CountdownChip deadline={mock.deadline} />
          </div>
          <h1 className="text-2xl md:text-3xl font-display font-extrabold text-ink">{mock.title}</h1>
          <div className="text-lg">{mock.price} {mock.currency} / unit</div>
          <div>
            <div className="flex items-center justify-between text-[11px] text-gray-700 dark:text-gray-300">
              <span>{mock.progressPct}%</span>
              <span>MOQ</span>
            </div>
            <Progress value={mock.progressPct} />
          </div>
          <div className="flex items-center gap-3 pt-2">
            <button className="btn-mag btn-primary-gradient rounded-full px-5 py-2 text-white shadow-card">Join Pool</button>
            <button className="rounded-full px-4 py-2 border border-gray-200 dark:border-gray-800">Details</button>
          </div>
          <div className="pt-4 text-muted">Refund if not met · Trusted supplier</div>
        </div>
      </div>
    </div>
  );
}
