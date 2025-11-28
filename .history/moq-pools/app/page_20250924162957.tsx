import Link from 'next/link';
export default function Home() {
  return (
    <div className="grid md:grid-cols-2 gap-8 items-center">
      <div className="space-y-6">
        <h1 className="h1">Kickstarter for Products Already Being Made</h1>
        <p className="opacity-80 max-w-xl">Join group buys to hit MOQ on real factory products. Once MOQ is met, supplier drop-ships to each buyer.</p>
        <div className="flex gap-3">
          <Link className="btn" href="/products">Browse Pools</Link>
          <a className="btn" href="/admin/pools">Admin</a>
        </div>
      </div>
      <div className="card">
        <h3 className="h3 mb-3">How it works</h3>
        <ol className="list-decimal pl-5 space-y-2">
          <li>Pick a product & choose quantity</li>
          <li>Pay securely</li>
          <li>When MOQ is met, we place the order</li>
          <li>Supplier ships to your address</li>
        </ol>
      </div>
    </div>
  );
}
