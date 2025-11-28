"use client";
import Link from 'next/link';
import Image from 'next/image';
import { signIn } from 'next-auth/react';
import { useCallback, useEffect, useRef, useState, createContext, useContext } from 'react';
import { useRouter } from 'next/navigation';
import { User2, ChevronDown, ShoppingBag } from 'lucide-react';
import { useWebSocket } from '@/hooks/useWebSocket';
// Social logos (kept in repo at root folder "company logos")
// Using static imports so Next.js can bundle them
// Note: folder name contains a space
import fbLogo from '../../company logos/Facebook-Logo-JPG.jpg';
import xLogo from '../../company logos/Twitter.png';
import googleLogo from '../../company logos/google logo.jpg';
import PageDropdown from '@/components/PageDropdown';

// Shared auth state context for Navbar components only
type MeStatus = 'loading' | 'authenticated' | 'unauthenticated';
type MeUser = { id: string; email: string; name?: string; firstName?: string; image?: string; role?: string } | null;

const NavbarAuthContext = createContext<{
  status: MeStatus;
  user: MeUser;
  isAdmin: boolean;
  refresh: () => Promise<void>;
} | null>(null);

function NavbarAuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<MeStatus>('loading');
  const [user, setUser] = useState<MeUser>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const fetchMe = useCallback(async () => {
    try {
      const res = await fetch('/api/me', { method: 'GET', credentials: 'include', cache: 'no-store' });
      if (!res.ok) {
        setStatus('unauthenticated');
        setUser(null);
        setIsAdmin(false);
        return;
      }
      const data = await res.json();
      if (data?.ok && data?.user) {
        setUser(data.user as MeUser);
        setStatus('authenticated');
        setIsAdmin(data.user.role === 'ADMIN');
      } else {
        setStatus('unauthenticated');
        setUser(null);
        setIsAdmin(false);
      }
    } catch {
      setStatus('unauthenticated');
      setUser(null);
      setIsAdmin(false);
    }
  }, []);

  useEffect(() => { fetchMe(); }, [fetchMe]);

  return (
    <NavbarAuthContext.Provider value={{ status, user, isAdmin, refresh: fetchMe }}>
      {children}
    </NavbarAuthContext.Provider>
  );
}

function useNavbarAuth() {
  const context = useContext(NavbarAuthContext);
  if (!context) {
    throw new Error('useNavbarAuth must be used within NavbarAuthProvider');
  }
  return context;
}

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
    <NavbarAuthProvider>
      <NavbarContent scrolled={scrolled} progress={progress} />
    </NavbarAuthProvider>
  );
}

function NavbarContent({ scrolled, progress }: { scrolled: boolean; progress: number }) {
  const { isAdmin } = useNavbarAuth();
  
  return (
    <header className={`sticky top-0 z-40 transition-all duration-300 ${scrolled ? 'bg-white/90 backdrop-blur-xl shadow-lg border-b border-orange-100/50' : 'bg-white/70 backdrop-blur-md shadow-sm'}`}>
      <div className={`w-screen max-w-none px-6 md:px-10 xl:px-16 h-16 md:h-[72px] flex items-center ${isAdmin ? 'justify-between' : 'justify-center md:justify-between'}`}>
        {/* Brand */}
        <Link href="/" className={`flex items-center gap-2 group ${!isAdmin ? 'md:absolute md:left-6 md:xl:left-16' : ''}`}>
          <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow">
            <ShoppingBag className="w-6 h-6 text-white" />
          </span>
          <span className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-amber-500 bg-clip-text text-transparent">
            PoolBuy
          </span>
        </Link>

        {/* Primary nav - centered for non-admin, left for admin */}
        <nav className={`hidden md:flex items-center gap-6 md:gap-8 text-sm md:text-base font-medium ${!isAdmin ? 'mx-auto' : ''}`}>
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
        <div className={`hidden md:flex items-center gap-4 ${!isAdmin ? 'md:absolute md:right-6 md:xl:right-16' : ''}`}>
          {/* Shopping Cart */}
          <ShoppingCartLink />
          {/* Wishlist link */}
          <WishlistLink />
          {/* Notification Bell */}
          <NotificationBell />
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

function AuthMenu() {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const closeTimer = useRef<number | null>(null);
  const { status, user, refresh } = useNavbarAuth();
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
            className="nl-refer group inline-flex items-center gap-2 px-0 py-0 rounded-none bg-transparent text-sm md:text-base text-gray-900 hover:text-orange-600 focus:outline-none transition-colors"
            aria-haspopup="dialog"
          >
            <i className="ob-icon icon-personal nlr-icon inline-flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-orange-50 to-orange-100 text-orange-600 ring-2 ring-orange-200/50 shadow-sm">
              <User2 className="w-4 h-4" />
            </i>
            <div className="login-link flex items-center">
              <span className="nail-link font-medium max-w-[140px] truncate text-gray-900" title={status === 'authenticated' ? displayName : undefined}>
                {status === 'authenticated' ? displayName : 'Sign in / Join'}
              </span>
            </div>
            <ChevronDown className="w-4 h-4 text-current transition-transform group-hover:translate-y-0.5" />
          </button>

          {/* Popover */}
          <div
            className={`nail-popover nail-popover-bottom align-end absolute right-0 mt-2 w-48 sm:w-56 rounded-2xl border-2 border-orange-200/50 bg-white shadow-2xl ${open ? 'block' : 'hidden'}`}
            role="dialog"
            onMouseEnter={() => { clearCloseTimer(); }}
            onMouseLeave={() => { scheduleClose(450); }}
          >
            <span className="np-caret absolute -top-2 right-8 w-0 h-0 border-l-8 border-r-8 border-b-8 border-l-transparent border-r-transparent border-b-orange-200" />
            <div className="np-content p-4">
              <div className="login-content space-y-3">
                {status === 'authenticated' ? (
                  <div className="space-y-1">
                    <nav className="flex flex-col text-sm">
                      <Link href="/account" className="rounded-lg px-3 py-2 hover:bg-orange-50 hover:text-orange-600 font-medium transition-colors">My Account</Link>
                      <Link href="/account/orders" className="rounded-lg px-3 py-2 hover:bg-orange-50 hover:text-orange-600 transition-colors">Orders</Link>
                      <Link href="/account/wishlist" className="rounded-lg px-3 py-2 hover:bg-orange-50 hover:text-orange-600 transition-colors">Wishlist</Link>
                      <Link href="/account/settings" className="rounded-lg px-3 py-2 hover:bg-orange-50 hover:text-orange-600 transition-colors">Settings</Link>
                      <div className="h-px bg-gray-200 my-2" />
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
                        className="w-full text-left rounded-lg px-3 py-2 hover:bg-red-50 hover:text-red-600 text-red-600 font-medium transition-colors"
                      >
                        Sign Out
                      </button>
                    </nav>
                  </div>
                ) : (
                <div className="flex flex-col items-center gap-2 text-center">
                              <Link href="/login" className="nail-btn main-btn inline-flex items-center justify-center w-full rounded-full px-4 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 shadow-md hover:shadow-lg transition-all">Sign in</Link>
                              <Link href="/register" className="nail-btn inline-flex items-center justify-center w-full rounded-full px-4 py-2.5 text-sm font-semibold border-2 border-orange-300 text-orange-600 hover:text-orange-700 hover:bg-orange-50 hover:border-orange-400 transition-all">Join Free</Link>
                </div>
                )}
                {status !== 'authenticated' && (
                  <>
                    <div className="social-line flex items-center gap-2 text-xs text-gray-500">
                      <span className="shrink-0">Or continue with</span>
                      <div className="h-px bg-gray-200 grow" />
                    </div>
                    <div className="social-media">
                      <div className="flex items-center justify-center gap-4">
                        <button type="button" onClick={() => signIn('facebook', { callbackUrl: `${window.location.origin}/products` })} aria-label="Facebook" className="social-icon rounded-full w-10 h-10 inline-flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 hover:from-orange-50 hover:to-orange-100 border border-gray-200 hover:border-orange-300 shadow-sm hover:shadow-md transition-all">
                          <Image src={fbLogo} alt="Facebook" width={20} height={20} className="w-5 h-5 object-contain" />
                        </button>
                        <button type="button" onClick={() => signIn('twitter', { callbackUrl: `${window.location.origin}/products` })} aria-label="X" className="social-icon rounded-full w-10 h-10 inline-flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 hover:from-orange-50 hover:to-orange-100 border border-gray-200 hover:border-orange-300 shadow-sm hover:shadow-md transition-all">
                          <Image src={xLogo} alt="X" width={20} height={20} className="w-5 h-5 object-contain" />
                        </button>
                        <button type="button" onClick={() => signIn('google', { callbackUrl: `${window.location.origin}/products` })} aria-label="Google" className="social-icon rounded-full w-10 h-10 inline-flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 hover:from-orange-50 hover:to-orange-100 border border-gray-200 hover:border-orange-300 shadow-sm hover:shadow-md transition-all">
                          <Image src={googleLogo} alt="Google" width={20} height={20} className="w-5 h-5 object-contain" />
                        </button>
                      </div>
                    </div>
                    <div className="social-protocol text-[11px] text-gray-500 leading-relaxed">
                      By continuing you agree to our{' '}
                      <a className="protocol-link underline text-orange-600 hover:text-orange-700" href="/terms" target="_blank" rel="nofollow noopener">Terms</a> and{' '}
                      <a className="protocol-link underline text-orange-600 hover:text-orange-700" href="/privacy" target="_blank" rel="nofollow noopener">Privacy Policy</a>.
                    </div>
                    <div className="divd-line h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
                    <div className="quick-links grid grid-cols-2 gap-2 text-sm">
                      <Link href="/account/messages" className="q-link rounded-lg px-2 py-1.5 hover:bg-orange-50 hover:text-orange-600 transition-colors">Messages</Link>
                      <Link href="/account/quotes" className="q-link rounded-lg px-2 py-1.5 hover:bg-orange-50 hover:text-orange-600 transition-colors">Quotes</Link>
                      <Link href="/account/orders" className="q-link rounded-lg px-2 py-1.5 hover:bg-orange-50 hover:text-orange-600 transition-colors">Orders</Link>
                      <Link href="/account/orders/tracking" className="q-link rounded-lg px-2 py-1.5 hover:bg-orange-50 hover:text-orange-600 transition-colors">Tracking</Link>
                      <Link href="/account/wishlist" className="q-link rounded-lg px-2 py-1.5 hover:bg-orange-50 hover:text-orange-600 transition-colors">Wishlist</Link>
                      <Link href="/account/history" className="q-link rounded-lg px-2 py-1.5 hover:bg-orange-50 hover:text-orange-600 transition-colors">History</Link>
                      <Link href="/post-sourcing" className="q-link rounded-lg px-2 py-1.5 hover:bg-orange-50 hover:text-orange-600 transition-colors col-span-2">Post Sourcing Request</Link>
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
  const { status } = useNavbarAuth();
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
  className="font-medium inline-flex items-center text-gray-700 hover:text-orange-600 transition-colors"
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
        className={`nail-popover nail-popover-bottom align-end absolute right-0 mt-2 w-48 sm:w-56 rounded-2xl border-2 border-orange-200/50 bg-white shadow-2xl ${open ? 'block' : 'hidden'}`}
        role="dialog"
        onMouseEnter={() => { clearCloseTimer(); }}
        onMouseLeave={() => { scheduleClose(450); }}
      >
        <span className="np-caret absolute -top-2 right-8 w-0 h-0 border-l-8 border-r-8 border-b-8 border-l-transparent border-r-transparent border-b-orange-200" />
        <div className="np-content p-3">
          {status === 'authenticated' ? (
            <nav className="flex flex-col text-sm">
              <Link href="/account/messages" className="rounded-lg px-3 py-2 hover:bg-orange-50 hover:text-orange-600 font-medium transition-colors">My Messages</Link>
              <Link href="/account/orders" className="rounded-lg px-3 py-2 hover:bg-orange-50 hover:text-orange-600 transition-colors">Orders</Link>
              <Link href="/account/orders/tracking" className="rounded-lg px-3 py-2 hover:bg-orange-50 hover:text-orange-600 transition-colors">Order Tracking</Link>
              <Link href="/account/alerts" className="rounded-lg px-3 py-2 hover:bg-orange-50 hover:text-orange-600 transition-colors">Alerts</Link>
            </nav>
          ) : (
            <div className="nail-simple-login space-y-3 text-center p-2">
              <div className="login-tip text-sm text-gray-700 font-medium">Sign in to view messages</div>
              <div className="flex flex-col items-center gap-2">
                <Link href="/login" className="nail-btn main-btn inline-flex items-center justify-center w-full rounded-full px-4 py-2 text-sm font-bold text-white bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 shadow-md hover:shadow-lg transition-all">Sign in</Link>
                <Link href="/register" className="nail-btn inline-flex items-center justify-center w-full rounded-full px-4 py-2 text-sm font-semibold border-2 border-orange-300 text-orange-600 hover:text-orange-700 hover:bg-orange-50 hover:border-orange-400 transition-all">Join Free</Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function WishlistLink() {
  const { status } = useNavbarAuth();
  if (status !== 'authenticated') return null;
  return (
    <Link
      href="/account/wishlist"
      className="relative p-2 text-gray-700 hover:text-pink-600 transition-colors"
      title="My Wishlist"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
      </svg>
    </Link>
  );
}

function ShoppingCartLink() {
  const { status } = useNavbarAuth();
  const [itemCount, setItemCount] = useState(0);
  
  useEffect(() => {
    // Get cart items from localStorage
    try {
      const cart = JSON.parse(localStorage.getItem('shopping_cart') || '[]');
      setItemCount(cart.length);
    } catch {
      setItemCount(0);
    }
    
    // Listen for cart updates
    const handleStorageChange = () => {
      try {
        const cart = JSON.parse(localStorage.getItem('shopping_cart') || '[]');
        setItemCount(cart.length);
      } catch {
        setItemCount(0);
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('cart-updated', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('cart-updated', handleStorageChange);
    };
  }, []);
  
  return (
    <Link
      href="/cart"
      className="relative p-2 text-gray-700 hover:text-orange-600 transition-colors"
      title="Shopping Cart"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <circle cx="8" cy="21" r="1"/>
        <circle cx="19" cy="21" r="1"/>
        <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/>
      </svg>
      {itemCount > 0 && (
        <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-orange-600 text-[10px] font-bold text-white">
          {itemCount > 9 ? '9+' : itemCount}
        </span>
      )}
    </Link>
  );
}

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  read: boolean;
  timestamp: string;
}

function NotificationBell() {
  const { status } = useNavbarAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const fetchNotifications = useCallback(async () => {
    if (status !== 'authenticated') {
      console.log('[NotificationBell] Not authenticated, skipping fetch');
      return;
    }
    
    console.log('[NotificationBell] Fetching notifications...');
    try {
      setIsLoading(true);
      const response = await fetch('/api/notifications?limit=10');
      console.log('[NotificationBell] Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('[NotificationBell] Data received:', data);
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
        console.log('[NotificationBell] Unread count:', data.unreadCount);
      } else {
        console.error('[NotificationBell] Response not OK:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('[NotificationBell] Error fetching notifications:', error);
    } finally {
      setIsLoading(false);
    }
  }, [status]);
  
  // WebSocket for real-time notifications - ONLY when authenticated
  useWebSocket({
    onMessage: (message) => {
      if (message.type === 'NOTIFICATION' && status === 'authenticated') {
        // New notification received, refresh the list
        fetchNotifications();
      }
    },
    onConnect: () => {
      if (status === 'authenticated') {
        console.log('WebSocket connected for notifications');
        fetchNotifications();
      }
    },
  });
  
  useEffect(() => {
    console.log('[NotificationBell] Status changed:', status);
    
    if (status !== 'authenticated') {
      console.log('[NotificationBell] Not authenticated, clearing notifications');
      setNotifications([]);
      setUnreadCount(0);
      return;
    }
    
    // Only fetch when authenticated
    console.log('[NotificationBell] Authenticated, fetching notifications...');
    fetchNotifications();
    
    // Poll for new notifications every 30 seconds as fallback
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [status, fetchNotifications]);
  
  const markAsRead = async (notificationId: string) => {
    try {
      await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId, markAsRead: true }),
      });
      fetchNotifications(); // Refresh
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };
  
  const markAllAsRead = async () => {
    try {
      await fetch('/api/notifications/mark-all-read', { method: 'POST' });
      fetchNotifications(); // Refresh
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };
  
  if (status !== 'authenticated') return null;
  
  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-700 hover:text-orange-600 transition-colors"
        title="Notifications"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/>
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>
        </svg>
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>
      
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 rounded-2xl border-2 border-orange-200/50 bg-white shadow-2xl z-50">
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <h3 className="font-bold text-gray-900">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-xs text-orange-600 hover:text-orange-700 font-medium"
              >
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {isLoading ? (
              <div className="p-8 text-center text-gray-500">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto"></div>
                <p className="mt-2 text-sm">Loading...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-12 h-12 mx-auto mb-2 text-gray-300">
                  <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/>
                  <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>
                </svg>
                <p className="text-sm">No notifications</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className="p-4 hover:bg-orange-50 cursor-pointer border-b border-gray-100"
                  onClick={() => {
                    if (!notification.read) markAsRead(notification.id);
                    if (notification.link) window.location.href = notification.link;
                  }}
                >
                  <div className="flex items-start gap-3">
                    {!notification.read && <div className="w-2 h-2 rounded-full bg-orange-600 mt-2" />}
                    {notification.read && <div className="w-2 h-2 rounded-full bg-gray-300 mt-2" />}
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{notification.title}</p>
                      <p className="text-xs text-gray-600 mt-1">{notification.message}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(notification.timestamp).toLocaleString('en-US', {
                          hour: 'numeric',
                          minute: '2-digit',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="p-3 border-t border-gray-200 text-center">
            <Link href="/account/notifications" className="text-sm font-medium text-orange-600 hover:text-orange-700">
              View all notifications
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function AdminBadge() {
  const { status, user } = useNavbarAuth();
  const isAdmin = status === 'authenticated' && (user?.email || '').toLowerCase() === 'jonfong78@gmail.com';
  if (!isAdmin) return null;
  return (
    <Link
      href="/admin/support-tickets"
      className="inline-flex items-center gap-1.5 rounded-full border-2 border-orange-300 bg-gradient-to-r from-orange-50 to-amber-50 px-3 py-1.5 text-sm font-semibold text-orange-700 hover:from-orange-100 hover:to-amber-100 hover:border-orange-400 shadow-sm hover:shadow-md transition-all"
      title="Support Tickets"
    >
      <span className="inline-block size-1.5 rounded-full bg-red-600 animate-pulse" />
      Admin
    </Link>
  );
}
