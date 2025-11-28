export default function CancelPage() {
  return (
    <div className="w-screen max-w-none -mx-6 md:-mx-10 xl:-mx-16">
      <div className="px-6 md:px-10 xl:px-16 py-16 text-center space-y-3">
        <h1 className="text-2xl md:text-3xl font-display font-extrabold text-ink">Payment Cancelled</h1>
        <p className="text-muted">No problem—try again, or browse more pools.</p>
        <a href="/products" className="mt-4 inline-block rounded-full px-6 py-3 border-hairline">Browse Products</a>
      </div>
    </div>
  );
}
