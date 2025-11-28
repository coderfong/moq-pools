export const dynamic = 'force-dynamic';
export const metadata = { title: 'Quotes - Account - MOQ Pools' };
export default function QuotesPage() {
  return (
    <section className="mx-auto w-full max-w-[1100px] px-4 py-6 text-neutral-900">
      <h1 className="text-2xl font-bold">Quotes</h1>
      <div className="mt-4 rounded-xl border border-neutral-200 bg-white p-4 text-sm text-neutral-700">
        Your quotes will appear here.
      </div>
    </section>
  );
}
