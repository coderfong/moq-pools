import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="mt-16 w-screen max-w-none -mx-6 md:-mx-10 xl:-mx-16">
      <div className="h-[2px] bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(var(--primary-2))]" />
      <div className="px-6 md:px-10 xl:px-16 py-10 bg-surface text-ink border-t border-hairline">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <div className="font-display font-bold text-lg">MOQ Pools</div>
            <p className="text-sm text-muted mt-2">Team up to meet MOQ and unlock factory pricing.</p>
          </div>
          <div>
            <div className="font-semibold mb-2">Product</div>
            <ul className="space-y-1 text-sm text-muted">
              <li><Link href="/products" className="link-underline">Browse</Link></li>
              <li><Link href="/how-it-works" className="link-underline">How it works</Link></li>
              <li><Link href="/information/payment-protection" className="link-underline">Payment Protection</Link></li>
            </ul>
          </div>
          <div>
            <div className="font-semibold mb-2">Company</div>
            <ul className="space-y-1 text-sm text-muted">
              <li><a href="#" className="link-underline">About</a></li>
              <li><a href="#" className="link-underline">Contact</a></li>
            </ul>
          </div>
          <div>
            <div className="font-semibold mb-2">Legal</div>
            <ul className="space-y-1 text-sm text-muted">
              <li><a href="#" className="link-underline">Terms</a></li>
              <li><a href="#" className="link-underline">Privacy</a></li>
            </ul>
          </div>
        </div>
        <div className="mt-8 text-xs text-muted">© {new Date().getFullYear()} MOQ Pools. All rights reserved.</div>
      </div>
    </footer>
  );
}
