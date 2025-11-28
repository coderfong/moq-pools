"use client";
import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import MessagesFeed, { AlertStatus, AlertType } from "@/components/MessagesFeed";
import ReactMarkdown from 'react-markdown';
import rehypeSanitize from 'rehype-sanitize';

type Thread = {
  id: string;
  title: string;
  company?: string;
  avatarUrl?: string;
  preview?: string;
  updatedAt: number;
  unread?: boolean;
  notReplied?: boolean;
};
type Message = {
  id: string;
  threadId: string;
  sender: 'me' | 'them';
  text: string;
  createdAt: number;
};

type Me = { id: string; email: string; role?: string | null; name?: string | null } | null;
type SearchUser = { id: string; email: string; name?: string | null; role?: string | null };

async function fetchThreads(): Promise<Thread[]> {
  const res = await fetch('/api/threads', { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to load threads');
  const data = await res.json();
  return data.threads as Thread[];
}

async function fetchMessages(threadId: string): Promise<Message[]> {
  const res = await fetch(`/api/messages?threadId=${encodeURIComponent(threadId)}`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to load messages');
  const data = await res.json();
  return data.messages as Message[];
}

async function postMessage(threadId: string, text: string) {
  const res = await fetch('/api/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ threadId, text }),
  });
  if (!res.ok) throw new Error('Failed to send message');
  return res.json();
}

async function createThread(input?: { title?: string; company?: string; avatarUrl?: string }) {
  const res = await fetch('/api/threads', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input ?? {}),
  });
  if (!res.ok) throw new Error('Failed to create thread');
  const data = await res.json();
  return data.thread as Thread;
}

async function createAdminThreadByEmail(targetEmail: string, input?: { title?: string; company?: string; avatarUrl?: string }) {
  const res = await fetch('/api/threads', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...(input ?? {}), targetEmail }),
  });
  if (!res.ok) {
    let detail = '';
    try { const j = await res.json(); detail = j?.error || j?.message || ''; } catch {}
    throw new Error(detail ? `Failed to create/open admin thread: ${detail}` : 'Failed to create/open admin thread');
  }
  const data = await res.json();
  return data.thread as Thread;
}

async function searchUsers(q: string): Promise<SearchUser[]> {
  const url = `/api/users/search?q=${encodeURIComponent(q)}`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) return [];
  const data = await res.json();
  return (data.users as SearchUser[]) || [];
}

export default function MessagesClient() {
  const pathname = usePathname();
  const search = useSearchParams();
  const trackingActive = !!pathname && pathname.startsWith('/account/orders/tracking');
  // Optional admin avatar URL (set in .env as NEXT_PUBLIC_ADMIN_AVATAR_URL)
  const ADMIN_AVATAR_URL = process.env.NEXT_PUBLIC_ADMIN_AVATAR_URL as string | undefined;
  const taRef = useRef<HTMLTextAreaElement>(null);

  function autoGrowTextArea(el?: HTMLTextAreaElement | null) {
    const t = el ?? taRef.current;
    if (!t) return;
    const maxPx = 120; // cap textarea height (reduced from 160)
    t.style.height = 'auto';
    const newH = Math.min(t.scrollHeight, maxPx);
    t.style.height = `${newH}px`;
  }

  // Declare text state before using it in effects
  const [text, setText] = useState('');
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<Message[]>([]);
  useEffect(() => {
    // Adjust height when text changes (e.g., templates, pool insertions)
    autoGrowTextArea();
  }, [text]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [creating, setCreating] = useState(false);
  // Inbox tabs
  const [tab, setTab] = useState<'all' | 'unread' | 'read' | 'not_replied' | 'replied'>('all');
  const [moreOpen, setMoreOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const moreBtnRef = useRef<HTMLButtonElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const [me, setMe] = useState<Me>(null);
  const [adminTargetEmail, setAdminTargetEmail] = useState('');
  const [adminResults, setAdminResults] = useState<SearchUser[]>([]);
  const [adminSearching, setAdminSearching] = useState(false);
  const [adminShowResults, setAdminShowResults] = useState(false);
  const adminSearchVersion = useRef(0);
  const [editOpen, setEditOpen] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editCompany, setEditCompany] = useState('');
  const [editAvatar, setEditAvatar] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [poolOpen, setPoolOpen] = useState(false);
  const [poolQ, setPoolQ] = useState('');
  const [poolResults, setPoolResults] = useState<any[]>([]);
  const [poolLoading, setPoolLoading] = useState(false);
  const poolVer = useRef(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [tplOpen, setTplOpen] = useState(false);

  // Load threads on mount
  useEffect(() => {
    let mounted = true;
    // load me
    fetch('/api/me', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => mounted && setMe(d?.ok ? (d.user as Me) : null))
      .catch(() => mounted && setMe(null));
    fetchThreads()
      .then((t) => {
        if (!mounted) return;
        setThreads(t);
        if (t.length && !activeId) setActiveId(t[0].id);
      })
      .catch(() => { if (mounted) setThreads([]); })
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, []);

  // Apply initial tab from query parameter (?tab=inquiries|rfqs|chats)
  useEffect(() => {
    const t = (search?.get('tab') || '').toLowerCase();
    if (t === 'inquiries') {
      setTab('unread');
    } else if (t === 'rfqs') {
      setTab('not_replied');
    } else if (t === 'chats') {
      setTab('all');
    }
  }, [search]);

  // Load messages for active thread
  useEffect(() => {
    if (!activeId) return;
    let mounted = true;
    fetchMessages(activeId).then((m) => {
      if (!mounted) return;
      setMsgs(m);
      // scroll to bottom soon after render
      setTimeout(() => scrollRef.current?.scrollTo({ top: 1e9, behavior: 'smooth' }), 50);
    });
    return () => {
      mounted = false;
    };
  }, [activeId]);

  // Poll for new messages every 3s
  useEffect(() => {
    if (!activeId) return;
    const id = setInterval(() => {
      fetchMessages(activeId).then((m) => setMsgs(m));
    }, 3000);
    return () => clearInterval(id);
  }, [activeId]);

  // Close More menu on Escape
  useEffect(() => {
    if (!moreOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setMoreOpen(false);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [moreOpen]);

  // Close More menu on outside click
  useEffect(() => {
    if (!moreOpen) return;
    function onDown(e: MouseEvent) {
      const target = e.target as Node | null;
      const btnOk = moreBtnRef.current && target && moreBtnRef.current.contains(target);
      const menuOk = moreMenuRef.current && target && moreMenuRef.current.contains(target);
      if (!btnOk && !menuOk) setMoreOpen(false);
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [moreOpen]);

  const activeThread = useMemo(() => threads.find((t) => t.id === activeId) || null, [threads, activeId]);
  function deriveThreadTitle(t: Thread): string {
    if (t.title && t.title.trim().length > 0) return t.title;
    const p = t.preview || '';
    // Try to extract markdown bold **Pool Name** — Supplier
    const boldStart = p.indexOf('**');
    if (boldStart !== -1) {
      const boldEnd = p.indexOf('**', boldStart + 2);
      if (boldEnd !== -1 && boldEnd > boldStart + 2) {
        return p.slice(boldStart + 2, boldEnd).trim();
      }
    }
    // Fallback: first line up to an em dash separator
    const firstLine = p.split('\n')[0] || '';
    if (firstLine.includes('—')) return firstLine.split('—')[0].trim();
    if (firstLine.trim().length > 0) return firstLine.trim();
    return 'Conversation';
  }
  const displayedThreads = useMemo(() => {
    switch (tab) {
      case 'unread':
        return threads.filter((t) => t.unread);
      case 'read':
        return threads.filter((t) => t.unread === false);
      case 'not_replied':
        return threads.filter((t) => t.notReplied);
      case 'replied':
        return threads.filter((t) => t.notReplied === false);
      default:
        return threads;
    }
  }, [threads, tab]);

  async function handleSend() {
    if (!activeId || !text.trim()) return;
    const content = text.trim();
    setText('');
    // optimistic append
    setMsgs((curr) => [
      ...curr,
      { id: `tmp-${Date.now()}`, threadId: activeId, sender: 'me', text: content, createdAt: Date.now() },
    ]);
    try {
      setSending(true);
      await postMessage(activeId, content);
      // refresh
      const fresh = await fetchMessages(activeId);
      setMsgs(fresh);
      setTimeout(() => scrollRef.current?.scrollTo({ top: 1e9, behavior: 'smooth' }), 25);
    } finally {
      setSending(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  async function saveThreadEdits() {
    if (!activeThread) return;
    try {
      setSavingEdit(true);
      const res = await fetch('/api/threads', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: activeThread.id, title: editTitle, company: editCompany, avatarUrl: editAvatar }),
      });
      if (!res.ok) throw new Error('Failed to save');
      const d = await res.json();
      const th = d.thread as Thread;
      setThreads((curr) => curr.map((t) => (t.id === th.id ? { ...t, title: th.title, company: th.company, avatarUrl: th.avatarUrl, updatedAt: th.updatedAt } : t)));
      setEditOpen(false);
    } finally {
      setSavingEdit(false);
    }
  }

  // Prepare edit fields when toggling edit open
  useEffect(() => {
    if (editOpen && activeThread) {
      setEditTitle(activeThread.title || '');
      setEditCompany(activeThread.company || '');
      setEditAvatar(activeThread.avatarUrl || '');
    }
  }, [editOpen, activeThread?.id]);

  // Load quick pools on open or query change (debounced)
  useEffect(() => {
    if (!poolOpen) return;
    const v = ++poolVer.current;
    setPoolLoading(true);
    const url = `/api/pools/quick?q=${encodeURIComponent(poolQ)}&take=12`;
    fetch(url, { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => { if (poolVer.current === v) setPoolResults(d?.pools || []); })
      .catch(() => { if (poolVer.current === v) setPoolResults([]); })
      .finally(() => { if (poolVer.current === v) setPoolLoading(false); });
  }, [poolOpen, poolQ]);

  const [mode, setMode] = useState<'inbox' | 'alerts'>('inbox');
  const [alertsTab, setAlertsTab] = useState<'all' | AlertType>('all');
  const [alertsStatus, setAlertsStatus] = useState<'all' | AlertStatus>('all');
  const [alertsUnread, setAlertsUnread] = useState<number>(0);
  const [alertsTypeUnread, setAlertsTypeUnread] = useState<Partial<Record<AlertType, number>>>({});
  const feedRef = useRef<any>(null);
  const isInbox = mode === 'inbox';
  const isAlerts = mode === 'alerts';

  return (
    <section className="h-screen w-full bg-neutral-50 text-neutral-900 flex flex-col">
      {/* Top toggle */}
      <div className="w-full px-8 py-3 flex items-center justify-between text-gray-900">
        <h1 className="text-xl font-bold bg-gradient-to-r from-gray-900 to-blue-600 bg-clip-text text-transparent">Messages</h1>
      </div>

      {mode === 'alerts' ? (
        <div className="flex-1 w-full px-8 min-h-0 grid grid-cols-[180px_300px_1fr] lg:grid-cols-[200px_340px_1fr] border-2 border-blue-200/50 rounded-2xl overflow-hidden shadow-lg bg-white">
          {/* Far-left: Mode selector */}
          <aside className="min-h-0 border-r-2 border-blue-200/30 bg-gradient-to-b from-blue-50/20 to-white p-4">
            <div className="space-y-3">
              <div>
                <div className="text-xs uppercase tracking-wide font-bold bg-gradient-to-r from-gray-700 to-blue-600 bg-clip-text text-transparent mb-3">View</div>
                <div className="flex flex-col gap-2">
                  {/* Keep a stable order: Inbox first, Alerts second */}
                  <button
                    className={`w-full rounded-xl px-3 py-2 text-sm text-left font-medium transition-all duration-300 ${isInbox ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/30 font-semibold' : 'border-2 border-blue-200 text-gray-700 hover:bg-blue-50 hover:border-blue-300'}`}
                    onClick={() => setMode('inbox')}
                  >💬 Inbox</button>
                  
                    <Link
                      href="/account/alerts"
                      className={`w-full rounded-xl px-3 py-2 text-sm text-left border-2 border-blue-200 text-gray-700 hover:bg-blue-50 hover:border-blue-300 transition-all duration-300 font-medium`}
                    >🔔 Alerts</Link>
                  <Link
                    href="/account/orders/tracking"
                    className={`w-full rounded-xl px-3 py-2 text-sm text-left font-medium transition-all duration-300 ${trackingActive ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/30 font-semibold' : 'border-2 border-blue-200 text-gray-700 hover:bg-blue-50 hover:border-blue-300'}`}
                  >
                    🚚 Order Tracking
                  </Link>
                </div>
              </div>
            </div>
          </aside>
          {/* Left: Filters for Alerts */}
          <aside className="min-h-0 flex flex-col border-r-2 border-blue-200/30 bg-white">
            <div className="p-4 border-b-2 border-blue-200/30">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-500/30 flex items-center justify-center text-xl">💬</div>
                  <h1 className="text-xl font-bold bg-gradient-to-r from-gray-900 to-blue-600 bg-clip-text text-transparent">Alerts</h1>
                </div>
                <div className="relative">
                  <button className="rounded-lg px-2 py-1 hover:bg-neutral-100" aria-label="Notifications">🔔</button>
                  {alertsUnread > 0 && (
                    <span className="absolute -right-1 -top-1 inline-flex items-center justify-center rounded-full bg-red-600 text-white text-[10px] leading-none px-1.5 py-0.5">
                      {alertsUnread}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Tabs (category) */}
            <nav className="border-b border-neutral-200 px-4 py-2">
              <div className="flex flex-wrap items-center gap-2">
                <button className={`px-3 py-1.5 rounded-full text-sm relative ${alertsTab === 'all' ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'}`} onClick={() => setAlertsTab('all')}>
                  All
                  {alertsUnread > 0 && <span className="absolute -right-2 -top-1 inline-block min-w-[16px] px-1 rounded-full bg-red-600 text-white text-[10px] text-center">{alertsUnread}</span>}
                </button>
                <button className={`px-3 py-1.5 rounded-full text-sm relative ${alertsTab === 'group_update' ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'}`} onClick={() => setAlertsTab('group_update')}>
                  Group Updates
                  {!!(alertsTypeUnread['group_update'] || 0) && <span className="absolute -right-2 -top-1 inline-block min-w-[16px] px-1 rounded-full bg-red-600 text-white text-[10px] text-center">{alertsTypeUnread['group_update']}</span>}
                </button>
                <button className={`px-3 py-1.5 rounded-full text-sm relative ${alertsTab === 'shipping' ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'}`} onClick={() => setAlertsTab('shipping')}>
                  Shipping
                  {!!(alertsTypeUnread['shipping'] || 0) && <span className="absolute -right-2 -top-1 inline-block min-w-[16px] px-1 rounded-full bg-red-600 text-white text-[10px] text-center">{alertsTypeUnread['shipping']}</span>}
                </button>
                <button className={`px-3 py-1.5 rounded-full text-sm relative ${alertsTab === 'promotion' ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'}`} onClick={() => setAlertsTab('promotion')}>
                  Promotions
                  {!!(alertsTypeUnread['promotion'] || 0) && <span className="absolute -right-2 -top-1 inline-block min-w-[16px] px-1 rounded-full bg-red-600 text-white text-[10px] text-center">{alertsTypeUnread['promotion']}</span>}
                </button>
                <button className={`px-3 py-1.5 rounded-full text-sm relative ${alertsTab === 'system' ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'}`} onClick={() => setAlertsTab('system')}>
                  System
                  {!!(alertsTypeUnread['system'] || 0) && <span className="absolute -right-2 -top-1 inline-block min-w-[16px] px-1 rounded-full bg-red-600 text-white text-[10px] text-center">{alertsTypeUnread['system']}</span>}
                </button>
              </div>
            </nav>

            {/* Status filter on left */}
            <div className="px-4 py-2">
              <label htmlFor="alerts-status" className="block text-sm text-neutral-700">Status</label>
              <select
                id="alerts-status"
                className="mt-1 w-full rounded-lg border border-neutral-200 bg-white px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-neutral-900"
                value={alertsStatus}
                onChange={(e) => setAlertsStatus(e.target.value as 'all' | AlertStatus)}
              >
                <option value="all">All</option>
                <option value="unread">Unread</option>
                <option value="read">Read</option>
              </select>
              <div className="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  className="rounded-lg border border-neutral-200 px-3 py-1.5 text-sm hover:bg-neutral-50"
                  onClick={() => feedRef.current?.markAllVisibleAsRead?.()}
                >Mark all as read</button>
                <button
                  type="button"
                  className="rounded-lg border border-neutral-200 px-3 py-1.5 text-sm hover:bg-neutral-50"
                  onClick={async () => {
                    if (typeof window !== 'undefined' && 'Notification' in window) {
                      try {
                        if (Notification.permission === 'default') await Notification.requestPermission();
                        if (Notification.permission === 'granted') new Notification('Notifications enabled for Alerts');
                      } catch {}
                    }
                  }}
                >Enable push</button>
              </div>
            </div>

            {/* Spacer to allow scroll on right */}
            <div className="mt-auto" />
          </aside>

          {/* Right: Alerts Feed */}
          <main className="min-h-0 flex flex-col bg-neutral-25">
            <div className="min-h-0 flex-1 overflow-y-auto bg-neutral-50">
              <MessagesFeed
                ref={feedRef}
                showHeader={false}
                activeTab={alertsTab}
                statusFilter={alertsStatus}
                refreshIntervalMs={30000}
                onComputedCounts={(c) => { setAlertsUnread(c.unreadTotal); setAlertsTypeUnread(c.perTypeUnread); }}
              />
            </div>
          </main>
        </div>
      ) : (
      <div className="flex-1 w-full px-8 min-h-0 grid grid-cols-[180px_300px_1fr] lg:grid-cols-[200px_340px_1fr] border-2 border-blue-200/50 rounded-2xl overflow-hidden shadow-lg bg-white">
        {/* Far-left: Mode selector */}
        <aside className="min-h-0 border-r-2 border-blue-200/30 bg-gradient-to-b from-blue-50/20 to-white p-4">
          <div className="space-y-3">
            <div>
              <div className="text-xs uppercase tracking-wide font-bold bg-gradient-to-r from-gray-700 to-blue-600 bg-clip-text text-transparent mb-3">View</div>
              <div className="flex flex-col gap-2">
                {/* Keep a stable order: Inbox first, Alerts second */}
                <button
                  className={`w-full rounded-xl px-3 py-2 text-sm text-left font-medium transition-all duration-300 ${isInbox ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/30 font-semibold' : 'border-2 border-blue-200 text-gray-700 hover:bg-blue-50 hover:border-blue-300'}`}
                  onClick={() => setMode('inbox')}
                >💬 Inbox</button>
                
                  <Link
                    href="/account/alerts"
                    className={`w-full rounded-xl px-3 py-2 text-sm text-left border-2 border-blue-200 text-gray-700 hover:bg-blue-50 hover:border-blue-300 transition-all duration-300 font-medium`}
                  >🔔 Alerts</Link>
                <Link
                  href="/account/orders/tracking"
                  className={`w-full rounded-xl px-3 py-2 text-sm text-left font-medium transition-all duration-300 ${trackingActive ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/30 font-semibold' : 'border-2 border-blue-200 text-gray-700 hover:bg-blue-50 hover:border-blue-300'}`}
                >
                  🚚 Order Tracking
                </Link>
              </div>
            </div>
          </div>
        </aside>
        {/* Sidebar */}
  <aside className="min-h-0 flex flex-col border-r-2 border-blue-200/30 bg-white">
          <div className="p-4 border-b-2 border-blue-200/30">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-3">
              <div className="size-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-500/30 flex items-center justify-center text-xl">💬</div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-gray-900 to-blue-600 bg-clip-text text-transparent">Inbox</h1>
              </div>
              {/* New conversation button removed per request */}
            </div>
            <label className="mt-4 flex items-center gap-2 rounded-xl border-2 border-blue-200 bg-blue-50/30 px-3 py-2 focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-all">
              <svg className="size-4 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="11" cy="11" r="7" strokeWidth="1.5"/><path d="m20 20-3.5-3.5" strokeWidth="1.5"/></svg>
              <input placeholder="Search" className="w-full bg-transparent outline-none placeholder:text-blue-400" />
            </label>
            {me?.role === 'ADMIN' && (
              <div className="mt-3 rounded-xl border-2 border-orange-200 bg-gradient-to-br from-orange-50/50 to-white p-3 shadow-sm">
                <p className="mb-2 text-xs font-semibold text-gray-700">Message a user (admin)</p>
                <div className="relative">
                  <div className="flex items-center gap-2">
                    <input
                      type="email"
                      value={adminTargetEmail}
                      onFocus={() => setAdminShowResults(true)}
                      onChange={async (e) => {
                        const val = e.target.value;
                        setAdminTargetEmail(val);
                        if (val.trim().length < 2) {
                          setAdminResults([]);
                          return;
                        }
                        const ver = ++adminSearchVersion.current;
                        setAdminSearching(true);
                        try {
                          const res = await searchUsers(val.trim());
                          if (adminSearchVersion.current === ver) setAdminResults(res);
                        } finally {
                          if (adminSearchVersion.current === ver) setAdminSearching(false);
                        }
                      }}
                      placeholder="Search email or name"
                      className="flex-1 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-neutral-900"
                    />
                    <button
                      type="button"
                      className="inline-flex items-center rounded-lg bg-neutral-900 px-3 py-1.5 text-sm text-white hover:bg-neutral-800 disabled:opacity-50"
                      disabled={!adminTargetEmail.trim() || creating}
                      onClick={async () => {
                        if (!adminTargetEmail.trim()) return;
                        try {
                          setCreating(true);
                          const th = await createAdminThreadByEmail(adminTargetEmail.trim(), ADMIN_AVATAR_URL ? { avatarUrl: ADMIN_AVATAR_URL } : undefined);
                          setActiveId(th.id);
                          try {
                            const t = await fetchThreads();
                            setThreads(t);
                          } catch {
                            setThreads((prev) => [{ ...th, unread: false, notReplied: true }, ...prev.filter(x => x.id !== th.id)]);
                          }
                          setMsgs([]);
                          setAdminTargetEmail('');
                          setAdminResults([]);
                          setAdminShowResults(false);
                        } catch (e: any) {
                          console.error(e);
                          alert(e?.message || 'Failed to create/open admin thread');
                        } finally {
                          setCreating(false);
                        }
                      }}
                    >
                      Message
                    </button>
                  </div>
                  {adminShowResults && adminResults.length > 0 && (
                    <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-lg border border-neutral-200 bg-white text-sm shadow-sm">
                      {adminResults.map((u) => (
                        <button
                          key={u.id}
                          type="button"
                          className="block w-full px-3 py-2 text-left hover:bg-neutral-50"
                          onClick={async () => {
                            try {
                              setCreating(true);
                              const th = await createAdminThreadByEmail(u.email, ADMIN_AVATAR_URL ? { avatarUrl: ADMIN_AVATAR_URL } : undefined);
                              setActiveId(th.id);
                              try {
                                const t = await fetchThreads();
                                setThreads(t);
                              } catch {
                                setThreads((prev) => [{ ...th, unread: false, notReplied: true }, ...prev.filter(x => x.id !== th.id)]);
                              }
                              setMsgs([]);
                              setAdminTargetEmail('');
                              setAdminResults([]);
                              setAdminShowResults(false);
                            } catch (e: any) {
                              console.error(e);
                              alert(e?.message || 'Failed to create/open admin thread');
                            } finally {
                              setCreating(false);
                            }
                          }}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="truncate font-medium">{u.email}</span>
                            {u.name && <span className="truncate text-neutral-500">{u.name}</span>}
                          </div>
                        </button>
                      ))}
                      {adminSearching && (
                        <div className="px-3 py-2 text-neutral-500">Searching…</div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Inquiry filter tabs */}
          <nav className="border-b border-neutral-200 px-4 py-2">
            <div
              className="inquiry-filter-type-list flex items-center gap-2"
              // Non-functional analytics-style attributes preserved from snippet
              {...{ 'faw-module': 'inbox_tabname' } as any}
            >
              <button
                className={`inquiry-filter-type-item px-3 py-1.5 rounded-full text-sm ${tab === 'all' ? 'bg-neutral-900 text-white selected' : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'}`}
                data-optval="0"
                {...{ 'ads-data': 'st:80,tabnm:Inbox_All' } as any}
                onClick={() => setTab('all')}
              >
                All
              </button>
              <button
                className={`inquiry-filter-type-item px-3 py-1.5 rounded-full text-sm ${tab === 'unread' ? 'bg-neutral-900 text-white selected' : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'}`}
                data-optval="1"
                {...{ 'ads-data': "st:80,tabnm:'Inbox_Unread'" } as any}
                onClick={() => setTab('unread')}
              >
                Unread
                <span className="num ml-1 text-xs opacity-70">{threads.filter((t) => t.unread).length}</span>
              </button>
              <button
                className={`inquiry-filter-type-item px-3 py-1.5 rounded-full text-sm ${tab === 'not_replied' ? 'bg-neutral-900 text-white selected' : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'}`}
                data-optval="3"
                {...{ 'ads-data': 'st:80,tabnm:Inbox_Not yet replied' } as any}
                onClick={() => setTab('not_replied')}
              >
                Not yet replied
                <span className="num ml-1 text-xs opacity-70">{threads.filter((t) => t.notReplied).length}</span>
              </button>
              <button
                ref={moreBtnRef}
                type="button"
                className="inquiry-filter-type-more ml-auto inline-flex items-center gap-1 rounded-full px-2 py-1 text-sm text-neutral-700 hover:bg-neutral-100"
                onClick={() => setMoreOpen((v) => !v)}
              >
                More
                <svg className={`ob-icon icon-down size-3 transition-transform ${moreOpen ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor"><path d="M5.25 7.5 10 12.25 14.75 7.5" /></svg>
              </button>
            </div>
            {moreOpen && (
              <div ref={moreMenuRef} className="mt-2 rounded-lg border border-neutral-200 bg-white p-2 text-sm shadow-sm">
                <button
                  className="block w-full rounded px-2 py-1 text-left hover:bg-neutral-50"
                  onClick={() => { setTab('read'); setMoreOpen(false); }}
                >
                  Read
                </button>
                <button
                  className="block w-full rounded px-2 py-1 text-left hover:bg-neutral-50"
                  onClick={() => { setTab('replied'); setMoreOpen(false); }}
                >
                  Replied
                </button>
              </div>
            )}
          </nav>

          {/* Threads */}
          <div className="flex-1 overflow-y-auto">
            <ul className="divide-y divide-neutral-200">
              {displayedThreads.map((t) => (
                <li key={t.id} className={`cursor-pointer hover:bg-neutral-50 ${activeId === t.id ? 'bg-neutral-50' : ''}`}>
                  <button className="w-full text-left" onClick={() => setActiveId(t.id)}>
                    <div className="flex items-start gap-3 p-4">
                      {t.avatarUrl ? (
                        <img className="size-10 rounded-lg object-cover" src={t.avatarUrl} alt="Avatar" />
                      ) : (
                        <div className="size-10 rounded-lg bg-neutral-200" />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            {t.unread && (
                              <span
                                className="inline-block size-2 shrink-0 rounded-full bg-blue-600"
                                aria-label="Unread"
                                title="Unread"
                              />
                            )}
                            <p className={`truncate ${t.unread ? 'font-semibold' : 'font-medium text-neutral-800'}`}>{deriveThreadTitle(t)}</p>
                          </div>
                          <time className="shrink-0 text-xs text-neutral-500">
                            {new Date(t.updatedAt).toLocaleDateString()}
                          </time>
                        </div>
                        {t.company && <p className="truncate text-sm text-neutral-600">{t.company}</p>}
                        {t.preview && (
                          <p className={`mt-1 line-clamp-2 text-sm ${t.unread ? 'text-neutral-700' : 'text-neutral-500'}`}>{t.preview}</p>
                        )}
                      </div>
                    </div>
                  </button>
                </li>
              ))}
              {!threads.length && !loading && (
                <li className="p-4 text-sm text-neutral-500">No threads yet.</li>
              )}
            </ul>
          </div>
        </aside>

        {/* Conversation Pane */}
  <main className="min-h-0 flex flex-col bg-neutral-25">
          {/* Header */}
          <header className="flex items-center justify-between gap-4 border-b border-neutral-200 px-6 py-4 bg-white">
            <div className="flex items-center gap-3 min-w-0">
              {activeThread?.avatarUrl || (me?.role === 'ADMIN' ? ADMIN_AVATAR_URL : undefined) ? (
                <img
                  className="size-10 rounded-lg object-cover"
                  src={(activeThread?.avatarUrl || (me?.role === 'ADMIN' ? ADMIN_AVATAR_URL : undefined)) as string}
                  alt=""
                />
              ) : (
                <div className="size-10 rounded-lg bg-neutral-200" />
              )}
              <div className="min-w-0">
                <h2 className="truncate font-semibold leading-tight">{activeThread?.title ?? 'Select a conversation'}</h2>
                {activeThread?.company && (
                  <p className="truncate text-sm text-neutral-500">{activeThread.company}</p>
                )}
              </div>
            </div>
            {me?.role === 'ADMIN' && activeThread && (
              <div className="flex items-center gap-2">
                <button
                  className="rounded-lg border border-neutral-200 px-3 py-1.5 text-sm hover:bg-neutral-50"
                  onClick={() => setEditOpen((v) => !v)}
                >
                  {editOpen ? 'Close' : 'Edit' }
                </button>
              </div>
            )}
          </header>

          {editOpen && me?.role === 'ADMIN' && activeThread && (
            <div className="border-b border-neutral-200 bg-neutral-50 px-6 py-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <label className="text-sm">
                  <div className="mb-1 text-neutral-600">Display name</div>
                  <input className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-neutral-900" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
                </label>
                <label className="text-sm">
                  <div className="mb-1 text-neutral-600">Company</div>
                  <input className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-neutral-900" value={editCompany} onChange={(e) => setEditCompany(e.target.value)} />
                </label>
                <label className="text-sm">
                  <div className="mb-1 text-neutral-600">Avatar URL</div>
                  <input className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-neutral-900" value={editAvatar} onChange={(e) => setEditAvatar(e.target.value)} placeholder="https://..." />
                </label>
              </div>
              <div className="mt-3 flex items-center justify-end gap-2">
                <button className="rounded-lg px-3 py-1.5 text-sm hover:bg-neutral-100" onClick={() => setEditOpen(false)}>Cancel</button>
                <button
                  className="rounded-lg bg-neutral-900 px-3 py-1.5 text-sm text-white hover:bg-neutral-800 disabled:opacity-50"
                  onClick={saveThreadEdits}
                  disabled={savingEdit}
                >Save</button>
              </div>
            </div>
          )}

          {/* Messages */}
          <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto bg-neutral-50 px-6 pt-6 pb-28 overscroll-contain">
            {activeId ? (
              <div className="space-y-4">
                {msgs.map((m) => (
                  <div key={m.id} className={`flex items-start gap-3 ${m.sender === 'me' ? 'justify-end' : ''}`}>
                    {m.sender === 'them' && (
                      me?.role === 'ADMIN' ? (
                        <div className="size-8 rounded-lg bg-neutral-200 text-neutral-600 flex items-center justify-center" title="User">
                          <svg className="size-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                            <path d="M12 12c2.761 0 5-2.239 5-5S14.761 2 12 2 7 4.239 7 7s2.239 5 5 5zm0 2c-4.418 0-8 2.015-8 4.5V21h16v-2.5c0-2.485-3.582-4.5-8-4.5z" />
                          </svg>
                        </div>
                      ) : (
                        <div className="size-8 rounded-lg bg-neutral-200" />
                      )
                    )}
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-3 shadow-xs border ${
                        m.sender === 'me'
                          ? 'bg-gradient-to-br from-purple-600 via-indigo-600 to-blue-600 text-white rounded-tr-md border-transparent'
                          : 'bg-white rounded-tl-md border-neutral-200'
                      }`}
                    >
                      {m.sender === 'me' ? (
                        <div className="rounded-xl bg-white/95 text-neutral-900 px-3 py-2 shadow-xs">
                          <div className="prose prose-sm max-w-none prose-p:my-0 prose-a:underline prose-a:underline-offset-2 prose-img:rounded-lg prose-img:shadow-sm">
                            <ReactMarkdown rehypePlugins={[rehypeSanitize]} components={{
                              a: ({node, ...props}) => <a {...props} target="_blank" rel="noopener noreferrer" className="underline" />,
                              img: ({node, ...props}) => <img {...props} alt={(props as any).alt || ''} />,
                            }}>
                              {m.text}
                            </ReactMarkdown>
                          </div>
                        </div>
                      ) : (
                        <div className="prose prose-sm max-w-none prose-p:my-0 prose-a:underline prose-a:underline-offset-2 prose-img:rounded-lg prose-img:shadow-sm">
                          <ReactMarkdown rehypePlugins={[rehypeSanitize]} components={{
                            a: ({node, ...props}) => <a {...props} target="_blank" rel="noopener noreferrer" className="underline" />,
                            img: ({node, ...props}) => <img {...props} alt={(props as any).alt || ''} />,
                          }}>
                            {m.text}
                          </ReactMarkdown>
                        </div>
                      )}
                      <div className={`mt-2 flex items-center gap-3 text-xs ${m.sender === 'me' ? 'justify-end text-neutral-300' : 'text-neutral-500'}`}>
                        <span>{new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                    {m.sender === 'me' && (
                      me?.role === 'ADMIN' ? (
                        <div className="size-8 rounded-lg bg-neutral-900 text-white flex items-center justify-center" title="Admin">
                          <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                            <path d="M12 3l7 4v6c0 5-3.5 9-7 10-3.5-1-7-5-7-10V7l7-4z" />
                            <path d="M9.5 12.5l2 2 4-4" />
                          </svg>
                        </div>
                      ) : (
                        <div className="size-8 rounded-lg bg-neutral-200" />
                      )
                    )}
                  </div>
                ))}
                {!msgs.length && (
                  <p className="text-sm text-neutral-500">No messages yet. Say hi!</p>
                )}
              </div>
            ) : (
              <p className="text-sm text-neutral-500">Select a thread to view messages.</p>
            )}
          </div>

          {/* Composer */}
          <footer className="sticky bottom-0 inset-x-0 border-t bg-white/95 supports-[backdrop-filter]:bg-white/75 backdrop-blur px-6 py-3">
            <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] items-end gap-3">
              <div className="flex-1 min-w-0">
                {/* NOTE: no overflow-hidden here so popovers/menus can escape */}
                <div className="rounded-2xl border border-neutral-200 bg-white px-4 py-2 focus-within:ring-2 focus-within:ring-neutral-900 max-w-full">
                  <textarea
                    ref={taRef}
                    rows={1}
                    placeholder={activeId ? 'Type your message…' : 'Select a conversation to start messaging…'}
                    className="w-full resize-none bg-transparent outline-none max-h-[120px] min-h-[1.5rem] overflow-y-auto"
                    disabled={!activeId || sending}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onInput={(e) => autoGrowTextArea(e.currentTarget)}
                    onKeyDown={onKeyDown}
                  />
                  <div className="mt-2 flex items-center justify-between flex-wrap gap-2">
                    <p className="text-xs text-neutral-500">Press Enter to send, Shift+Enter for new line</p>
                    <button
                      className="inline-flex items-center gap-2 rounded-xl bg-neutral-900 px-4 py-2 text-white hover:bg-neutral-800 disabled:opacity-50"
                      onClick={handleSend}
                      disabled={!activeId || !text.trim() || sending}
                    >
                      Send
                    </button>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 px-1 pt-2 text-xs text-neutral-600 relative flex-wrap md:justify-end md:self-end md:pl-2 shrink-0">
                <button
                  className="rounded border border-neutral-200 px-2 py-1 hover:bg-neutral-50"
                  type="button"
                  onClick={() => {
                    const url = prompt('Insert link URL');
                    if (!url) return;
                    const label = prompt('Link text (optional)') || url;
                    setText((t) => `${t}${t.endsWith('\n') || t.length === 0 ? '' : '\n'}[${label}](${url})`);
                  }}
                >Insert link</button>
                <button
                  className="rounded border border-neutral-200 px-2 py-1 hover:bg-neutral-50"
                  type="button"
                  onClick={() => {
                    const url = prompt('Insert image URL');
                    if (!url) return;
                    const alt = prompt('Alt text (optional)') || '';
                    setText((t) => `${t}${t.endsWith('\n') || t.length === 0 ? '' : '\n'}![${alt}](${url})`);
                  }}
                >Insert image</button>
                <>
                  <input
                    id="image-upload"
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    aria-label="Upload image"
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      try {
                        const fd = new FormData();
                        fd.append('file', f);
                        const res = await fetch('/api/uploads', { method: 'POST', body: fd });
                        const d = await res.json();
                        if (res.ok && d?.ok && d.url) {
                          setText((t) => `${t}${t.endsWith('\n') || t.length === 0 ? '' : '\n'}![](${d.url})`);
                        } else {
                          alert('Upload failed');
                        }
                      } catch (err) {
                        alert('Upload error');
                      } finally {
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }
                    }}
                  />
                  <label
                    htmlFor="image-upload"
                    className="rounded border border-neutral-200 px-2 py-1 hover:bg-neutral-50 cursor-pointer"
                  >Upload image</label>
                </>
                <div className="inline-block relative">
                  <button
                    className="rounded border border-neutral-200 px-2 py-1 hover:bg-neutral-50"
                    type="button"
                    onClick={() => setPoolOpen((v) => !v)}
                  >Insert poll</button>
                  {poolOpen && (
                    <div className="absolute right-0 bottom-full mb-2 z-20 w-[360px] rounded-lg border border-neutral-200 bg-white p-2 shadow-sm">
                      <input
                        className="mb-2 w-full rounded border border-neutral-200 px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-neutral-900"
                        placeholder="Search title or supplier"
                        value={poolQ}
                        onChange={(e) => setPoolQ(e.target.value)}
                      />
                      <div className="max-h-64 overflow-y-auto">
                        {poolLoading ? (
                          <div className="p-2 text-sm text-neutral-500">Loading…</div>
                        ) : poolResults.length === 0 ? (
                          <div className="p-2 text-sm text-neutral-500">No results</div>
                        ) : (
                          <ul className="divide-y divide-neutral-100">
                            {poolResults.map((p) => (
                              <li key={p.poolId}>
                                <button
                                  type="button"
                                  className="flex w-full items-center gap-2 px-2 py-2 text-left hover:bg-neutral-50"
                                  onClick={() => {
                                    const md = [
                                      p.image ? `![${p.title}](${p.image})` : null,
                                      `**${p.title}**${p.supplier ? ` — ${p.supplier}` : ''}`,
                                      (p.price != null && p.currency) ? `${p.price} ${p.currency} / unit` : null,
                                      `[View pool →](/p/${p.productId})`,
                                    ].filter(Boolean).join('\n');
                                    setText((t) => `${t}${t && !t.endsWith('\n') ? '\n' : ''}${md}\n`);
                                    // Keep menu open after selection per request
                                  }}
                                >
                                  <div className="size-12 rounded bg-neutral-100 overflow-hidden">
                                    {p.image ? <img src={p.image} alt={p.title} className="h-full w-full object-cover" /> : null}
                                  </div>
                                  <div className="min-w-0">
                                    <div className="truncate text-sm font-medium">{p.title}</div>
                                    <div className="truncate text-xs text-neutral-500">{p.supplier || '—'}</div>
                                  </div>
                                  <div className="ml-auto shrink-0 text-xs text-neutral-600">
                                    {p.price != null && p.currency ? `${p.price} ${p.currency}` : ''}
                                  </div>
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                <div className="inline-block relative">
                  <button
                    className="rounded border border-neutral-200 px-2 py-1 hover:bg-neutral-50"
                    type="button"
                    onClick={() => setTplOpen((v) => !v)}
                  >Templates</button>
                  {tplOpen && (
                    <div className="absolute right-0 bottom-full mb-2 z-20 w-[320px] rounded-lg border border-neutral-200 bg-white p-2 shadow-sm text-sm">
                      <button
                        className="block w-full rounded px-2 py-1 text-left hover:bg-neutral-50"
                        onClick={() => {
                          setText((t) => `${t}${t && !t.endsWith('\n') ? '\n' : ''}Hello! I wanted to share this MOQ pool with you. Let me know your target quantity and any customization needs.`);
                          // Keep templates menu open after inserting per request
                        }}
                      >Intro + MOQ ask</button>
                      <button
                        className="block w-full rounded px-2 py-1 text-left hover:bg-neutral-50"
                        onClick={() => {
                          setText((t) => `${t}${t && !t.endsWith('\n') ? '\n' : ''}Shipping: We consolidate and ship after MOQ is met. Typical lead time is 10–21 days depending on lane. Duties/taxes may apply.`);
                          // Keep templates menu open after inserting per request
                        }}
                      >Shipping & lead time</button>
                      <button
                        className="block w-full rounded px-2 py-1 text-left hover:bg-neutral-50"
                        onClick={() => {
                          setText((t) => `${t}${t && !t.endsWith('\n') ? '\n' : ''}Pricing: Unit price reflects factory quote at current MOQ. Larger commitments can reduce price. Reply with your target and we can optimize.`);
                          // Keep templates menu open after inserting per request
                        }}
                      >Pricing notes</button>
                      <button
                        className="block w-full rounded px-2 py-1 text-left hover:bg-neutral-50"
                        onClick={() => {
                          setText((t) => `${t}${t && !t.endsWith('\n') ? '\n' : ''}Thanks! If you want to proceed, reply here with your desired quantity and address and I’ll set everything up.`);
                          // Keep templates menu open after inserting per request
                        }}
                      >Thanks + CTA</button>
                    </div>
                  )}
                </div>
              </div>
              {/* Safe area padding for devices with bottom insets */}
              <div className="col-span-1 md:col-span-2 pt-[env(safe-area-inset-bottom)]" />
            </div>
          </footer>
        </main>
      </div>
      )}
    </section>
  );
}
