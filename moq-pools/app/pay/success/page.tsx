import Link from 'next/link';
export default function Success() {
  return (
    <div className="card space-y-3 max-w-lg mx-auto text-center">
      <h1 className="h2">Payment Successful 🎉</h1>
      <p className="opacity-80">We’ll notify you when MOQ is met and after the supplier ships.</p>
      <Link className="btn" href="/products">Back to Browse</Link>
    </div>
  )
}
