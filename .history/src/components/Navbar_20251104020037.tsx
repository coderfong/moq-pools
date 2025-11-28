"use client";
import Link from 'next/link';
import Image from 'next/image';
import { signIn } from 'next-auth/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { User2, ChevronDown, ShoppingBag } from 'lucide-react';
// Social logos (kept in repo at root folder "company logos")
// Using static imports so Next.js can bundle them
// Note: folder name contains a space
import fbLogo from '../../company logos/Facebook-Logo-JPG.jpg';
import xLogo from '../../company logos/Twitter.png';
import googleLogo from '../../company logos/google logo.jpg';
import PageDropdown from '@/components/PageDropdown';

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 8);
      const h = document.documentElement;
      const max = (h.scrollHeight - h.clientHeight) || 1;
      setProgress(Math.max(0, Math.min(1, window.scrollY / max)));
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return (
    <header className={`sticky top-0 z-40 transition-all duration-300 ${scrolled ? 'bg-white/90 backdrop-blur-xl shadow-lg border-b border-orange-100/50' : 'bg-white/70 backdrop-blur-md shadow-sm'}`}>
      <div className="w-screen max-w-none px-6 md:px-10 xl:px-16 h-16 md:h-[72px] flex items-center justify-between">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2 group">
          <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow">
            <ShoppingBag className="w-6 h-6 text-white" />
          </span>
          <span className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-amber-500 bg-clip-text text-transparent">
            PoolBuy
          </span>
        </Link>

        {/* Primary nav (left) */}
        <nav className="hidden md:flex items-center gap-6 md:gap-8 text-sm md:text-base font-medium">
          <Link href="/products" className="text-gray-700 hover:text-orange-600 transition-colors">Browse</Link>
          <Link href="/#how-it-works" className="text-gray-700 hover:text-orange-600 transition-colors">How It Works</Link>
          <Link href="/#benefits" className="text-gray-700 hover:text-orange-600 transition-colors">Benefits</Link>
          <Link href="/about" className="text-gray-700 hover:text-orange-600 transition-colors">About</Link>
          <Link href="/support" className="text-gray-700 hover:text-orange-600 transition-colors">Support</Link>
        </nav>

        {/* Quick page navigator */}
        <div className="hidden md:block">
          <PageDropdown />
        </div>

        {/* Auth area (right) with Messages next to email */}
        <div className="hidden md:flex items-center gap-6">
          {/* Messages first, then account/email */}
          <MessagesMenu />
          <AdminBadge />
          {/* Keep sign-in logic/popover */}
          <AuthMenu />
        </div>

        {/* Mobile menu button (placeholder) */}
        <button className="md:hidden p-2 text-gray-700 hover:text-orange-600 transition-colors" aria-label="Open menu">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6"><line x1="4" x2="20" y1="12" y2="12" /><line x1="4" x2="20" y1="6" y2="6" /><line x1="4" x2="20" y1="18" y2="18" /></svg>
        </button>
      </div>
    </header>
  );
}

type MeStatus = 'loading' | 'authenticated' | 'unauthenticated';
type MeUser = { id: string; email: string | null; name: string | null; firstName?: string | null } | null;

function useMe() {
  const [status, setStatus] = useState<MeStatus>('loading');
  const [user, setUser] = useState<MeUser>(null);

  const fetchMe = useCallback(async () => {
    try {
      const res = await fetch('/api/me', { method: 'GET', credentials: 'include', cache: 'no-store' });
      if (!res.ok) {
        setStatus('unauthenticated');
        setUser(null);
        return;
      }
      const data = await res.json();
      if (data?.ok && data?.user) {
        setUser(data.user as MeUser);
        setStatus('authenticated');
      } else {
        setStatus('unauthenticated');
        setUser(null);
      }
    } catch {
      setStatus('unauthenticated');
      setUser(null);
    }
  }, []);

  useEffect(() => { fetchMe(); }, [fetchMe]);

  return { status, user, refresh: fetchMe } as const;
}

function AuthMenu() {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const closeTimer = useRef<number | null>(null);
  const { status, user, refresh } = useMe();
  const router = useRouter();
  const displayName = (user?.firstName || user?.name || user?.email || 'Account') as string;

  const clearCloseTimer = () => {
    if (closeTimer.current != null) {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  };
  const scheduleClose = (ms = 400) => {
    clearCloseTimer();
    closeTimer.current = window.setTimeout(() => setOpen(false), ms) as unknown as number;
  };
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current) return;
      const t = e.target as Node;
      if (!rootRef.current.contains(t)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);
  return (
    <div
      ref={rootRef}
      className="nail-login-wrap nail-action-item relative"
      onMouseEnter={() => { clearCloseTimer(); setOpen(true); }}
      onMouseLeave={() => { scheduleClose(450); }}
    >
      <div className="nail-login J-top-loginInfo nail-unlogin">
        <div
          className="nail-popover-trigger"
          onMouseEnter={() => { clearCloseTimer(); setOpen(true); }}
        >
          <button
            type="button"
            onClick={() => {
              if (status === 'authenticated') {
                setOpen(v => !v);
              } else {
                router.push('/login');
              }
            }}
            className="nl-refer group inline-flex items-center gap-2 px-0 py-0 rounded-none bg-transparent text-sm md:text-base text-black hover:text-orange-600 focus:outline-none"
            aria-haspopup="dialog"
          >
            <i className="ob-icon icon-personal nlr-icon inline-flex items-center justify-center w-7 h-7 rounded-full bg-orange-50 text-orange-600 ring-1 ring-orange-100">
              <User2 className="w-4 h-4" />
            </i>
            <div className="login-link flex items-center text-gray-900">
              <span className="nail-link link-underline max-w-[140px] truncate" title={status === 'authenticated' ? displayName : undefined}>
                {status === 'authenticated' ? displayName : 'Sign in / Join'}
              </span>
            </div>
            <ChevronDown className="w-4 h-4 text-current" />
          </button>

          {/* Popover */}
          <div
            className={`nail-popover nail-popover-bottom align-end absolute right-0 mt-2 w-48 sm:w-56 rounded-2xl border border-gray-200 bg-white shadow-xl ${open ? 'block' : 'hidden'}`}
            role="dialog"
            onMouseEnter={() => { clearCloseTimer(); }}
            onMouseLeave={() => { scheduleClose(450); }}
          >
            <span className="np-caret absolute -top-2 right-8 w-0 h-0 border-l-8 border-r-8 border-b-8 border-l-transparent border-r-transparent border-b-gray-200" />
            <div className="np-content p-4">
              <div className="login-content space-y-3">
                {status === 'authenticated' ? (
                  <div className="space-y-1">
                    <nav className="flex flex-col text-sm">
                      <Link href="/account/history" className="rounded-lg px-3 py-2 hover:bg-gray-50 hover:text-orange-600">History</Link>
                      <Link href="/account/favorites" className="rounded-lg px-3 py-2 hover:bg-gray-50 hover:text-orange-600">Favourites</Link>
                      <Link href="/information/payment-protection" className="rounded-lg px-3 py-2 hover:bg-gray-50 hover:text-orange-600">Payment info</Link>
                      <Link href="/information/shipping-returns" className="rounded-lg px-3 py-2 hover:bg-gray-50 hover:text-orange-600">Shipping info</Link>
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            await fetch('/api/logout', { method: 'POST' });
                          } catch {}
                          setOpen(false);
                          await refresh();
                          router.push('/');
                        }}
                        className="text-left rounded-lg px-3 py-2 hover:bg-gray-50 hover:text-orange-600"
                      >
                        Sign Out
                      </button>
                    </nav>
                  </div>
                ) : (
                <div className="flex flex-col items-center gap-2 text-center">
                              <Link href="/login" className="nail-btn main-btn inline-flex-ctr w-44 justify-center rounded-full px-3 py-2 text-sm font-semibold text-white !text-white bg-gray-900 hover:bg-black transition-colors">Sign in</Link>
                              <Link href="/register" className="nail-btn inline-flex-ctr w-44 justify-center rounded-full px-3 py-2 text-sm font-semibold border border-gray-300 text-gray-800 hover:text-orange-700 hover:bg-orange-50 hover:border-orange-300 transition-colors">Join Free</Link>
                </div>
                )}
                {status !== 'authenticated' && (
                  <>
                    <div className="social-line flex items-center gap-2 text-xs text-gray-500">
                      <span className="shrink-0">Or</span>
                      <div className="h-px bg-gray-200 grow" />
                    </div>
                    <div className="social-media">
                      <div className="flex items-center justify-center gap-6">
                        <button type="button" onClick={() => signIn('facebook', { callbackUrl: `${window.location.origin}/products` })} aria-label="Facebook" className="social-icon rounded-full w-10 h-10 inline-flex items-center justify-center bg-gray-100 hover:bg-gray-200">
                          <Image src={fbLogo} alt="Facebook" width={20} height={20} className="w-5 h-5 object-contain" />
                        </button>
                        <button type="button" onClick={() => signIn('twitter', { callbackUrl: `${window.location.origin}/products` })} aria-label="X" className="social-icon rounded-full w-10 h-10 inline-flex items-center justify-center bg-gray-100 hover:bg-gray-200">
                          <Image src={xLogo} alt="X" width={20} height={20} className="w-5 h-5 object-contain" />
                        </button>
                        <button type="button" onClick={() => signIn('google', { callbackUrl: `${window.location.origin}/products` })} aria-label="Google" className="social-icon rounded-full w-10 h-10 inline-flex items-center justify-center bg-gray-100 hover:bg-gray-200">
                          <Image src={googleLogo} alt="Google" width={20} height={20} className="w-5 h-5 object-contain" />
                        </button>
                      </div>
                    </div>
                    <div className="social-protocol text-[11px] text-gray-500">
                      By clicking Sign in or Join Free you agree to our
                      {' '}<a className="protocol-link underline" href="/terms" target="_blank" rel="nofollow noopener">User Agreement</a> and
                      {' '}<a className="protocol-link underline" href="/privacy" target="_blank" rel="nofollow noopener">Privacy Policy</a>.
                    </div>
                    <div className="divd-line h-px bg-gray-200" />
                    <div className="quick-links grid grid-cols-2 gap-2 text-sm">
                      <Link href="/account/messages" className="q-link rounded-lg px-2 py-1.5 hover:bg-gray-50">Messages</Link>
                      <Link href="/account/quotes" className="q-link rounded-lg px-2 py-1.5 hover:bg-gray-50">Quotes</Link>
                      <Link href="/account/orders" className="q-link rounded-lg px-2 py-1.5 hover:bg-gray-50">Orders</Link>
                      <Link href="/account/orders/tracking" className="q-link rounded-lg px-2 py-1.5 hover:bg-gray-50">Order Tracking</Link>
                      <Link href="/account/favorites" className="q-link rounded-lg px-2 py-1.5 hover:bg-gray-50">Favorites</Link>
                      <Link href="/account/history" className="q-link rounded-lg px-2 py-1.5 hover:bg-gray-50">Browsing History</Link>
                      <Link href="/post-sourcing" className="q-link rounded-lg px-2 py-1.5 hover:bg-gray-50 col-span-2">Post Sourcing Request</Link>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MessagesMenu() {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const closeTimer = useRef<number | null>(null);
  const { status } = useMe();
  const router = useRouter();

  const clearCloseTimer = () => {
    if (closeTimer.current != null) {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  };
  const scheduleClose = (ms = 400) => {
    clearCloseTimer();
    closeTimer.current = window.setTimeout(() => setOpen(false), ms) as unknown as number;
  };

  return (
    <div
      ref={rootRef}
      className="relative"
      onMouseEnter={() => { clearCloseTimer(); setOpen(true); }}
      onMouseLeave={() => { scheduleClose(450); }}
    >
      <button
        type="button"
  className="link-underline inline-flex items-center text-gray-900"
        onClick={() => {
          if (status === 'authenticated') {
            router.push('/account/messages');
          } else {
            setOpen(v => !v);
          }
        }}
  aria-haspopup="dialog"
      >
        Messages
      </button>

      {/* Popover: show auth-specific content, but always render to support hover */}
      <div
        className={`nail-popover nail-popover-bottom align-end absolute right-0 mt-2 w-48 sm:w-56 rounded-2xl border border-gray-200 bg-white shadow-xl ${open ? 'block' : 'hidden'}`}
        role="dialog"
        onMouseEnter={() => { clearCloseTimer(); }}
        onMouseLeave={() => { scheduleClose(450); }}
      >
        <span className="np-caret absolute -top-2 right-8 w-0 h-0 border-l-8 border-r-8 border-b-8 border-l-transparent border-r-transparent border-b-gray-200" />
        <div className="np-content p-2">
          {status === 'authenticated' ? (
            <nav className="flex flex-col text-sm">
              <Link href="/account/orders" className="rounded-lg px-3 py-2 hover:bg-gray-50 hover:text-orange-600">Orders</Link>
              <Link href="/account/orders/tracking" className="rounded-lg px-3 py-2 hover:bg-gray-50 hover:text-orange-600">Order Tracking</Link>
              <Link href="/account/alerts" className="rounded-lg px-3 py-2 hover:bg-gray-50 hover:text-orange-600">Alerts</Link>
            </nav>
          ) : (
            <div className="nail-simple-login space-y-3 text-center p-2">
              <div className="login-tip text-sm text-gray-700">Sign in to view the new messages</div>
              <div className="flex flex-col items-center gap-2">
                <Link href="/login" className="nail-btn main-btn inline-flex-ctr w-40 justify-center rounded-full px-3 py-2 text-sm font-semibold text-white bg-gray-900 hover:bg-black">Sign in</Link>
                <Link href="/register" className="nail-btn inline-flex-ctr w-40 justify-center rounded-full px-3 py-2 text-sm font-semibold border border-gray-300 text-gray-800 hover:text-orange-700 hover:bg-orange-50 hover:border-orange-300">Join Free</Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AdminBadge() {
  const { status, user } = useMe();
  const isAdmin = status === 'authenticated' && (user?.email || '').toLowerCase() === 'jonfong78@gmail.com';
  if (!isAdmin) return null;
  return (
    <Link
      href="/admin/support-tickets"
      className="inline-flex items-center gap-1 rounded-full border border-gray-300 px-3 py-1.5 text-sm text-gray-900 hover:bg-gray-50"
      title="Support Tickets"
    >
      <span className="inline-block size-1.5 rounded-full bg-red-600" />
      Admin
    </Link>
  );
}
