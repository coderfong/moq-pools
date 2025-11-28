"use client";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";

// Types aligned to the snippet, adapted to our backend
type MessageType = "chat" | "system" | "shipping" | "promotion" | "group_update";
interface Conversation {
  id: string;
  title: string;
  lastMessageAt: string; // ISO
  unreadCount: number;
}
interface Message {
  id: string;
  conversationId: string;
  type: MessageType;
  title?: string;
  body: string; // plain text
  sender: "admin" | "user" | "system";
  createdAt: string; // ISO
  read: boolean;
}

// API mapped to existing routes (/api/threads and /api/messages)
const api = {
  async listConversations(cursor?: string): Promise<{ items: Conversation[]; nextCursor?: string }> {
    const res = await fetch("/api/threads", { cache: "no-store" });
    if (!res.ok) throw new Error("Failed to load conversations");
    const data = await res.json();
    const items: Conversation[] = (data.threads || []).map((t: any) => ({
      id: String(t.id),
      title: (t.title && String(t.title)) || "Conversation",
      lastMessageAt: new Date(t.updatedAt).toISOString(),
      unreadCount: t.unread ? 1 : 0,
    }));
    return { items, nextCursor: undefined };
  },
  async getMessages(conversationId: string, cursor?: string): Promise<{ items: Message[]; nextCursor?: string }> {
    const res = await fetch(`/api/messages?threadId=${encodeURIComponent(conversationId)}`, { cache: "no-store" });
    if (!res.ok) throw new Error("Failed to load messages");
    const data = await res.json();
    const items: Message[] = (data.messages || []).map((m: any) => ({
      id: String(m.id),
      conversationId: String(m.threadId ?? conversationId),
      type: "chat",
      body: String(m.text ?? ""),
      sender: m.sender === "me" ? "admin" : m.sender === "them" ? "user" : "system",
      createdAt: new Date(m.createdAt).toISOString(),
      read: true,
    }));
    return { items, nextCursor: undefined };
  },
  async sendMessage(conversationId: string, text: string): Promise<void> {
    const res = await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ threadId: conversationId, text }),
    });
    if (!res.ok) throw new Error("Failed to send message");
  },
  async markRead(conversationId: string): Promise<void> {
    await fetch('/api/threads/read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ threadId: conversationId }),
    }).catch(() => {});
  },
};

export default function MessagesInbox() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [convCursor, setConvCursor] = useState<string | undefined>(undefined);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [sending, setSending] = useState(false);
  const [text, setText] = useState("");

  const listRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [poolOpen, setPoolOpen] = useState(false);
  const [poolQ, setPoolQ] = useState("");
  const [poolResults, setPoolResults] = useState<any[]>([]);
  const [poolLoading, setPoolLoading] = useState(false);
  const poolVer = useRef(0);
  const [tplOpen, setTplOpen] = useState(false);

  const activeConv = useMemo(() => conversations.find((c) => c.id === activeId) || null, [conversations, activeId]);

  const autoGrow = useCallback((el?: HTMLTextAreaElement | null) => {
    const t = el ?? taRef.current;
    if (!t) return;
    const maxPx = 120;
    t.style.height = "auto";
    const newH = Math.min(t.scrollHeight, maxPx);
    t.style.height = `${newH}px`;
  }, []);

  useEffect(() => { autoGrow(); }, [text, autoGrow]);

  // Load quick pools when menu open or query changes
  useEffect(() => {
    if (!poolOpen) return;
    const v = ++poolVer.current;
    setPoolLoading(true);
    const url = `/api/pools/quick?q=${encodeURIComponent(poolQ)}&take=12`;
    fetch(url, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => { if (poolVer.current === v) setPoolResults(d?.pools || []); })
      .catch(() => { if (poolVer.current === v) setPoolResults([]); })
      .finally(() => { if (poolVer.current === v) setPoolLoading(false); });
  }, [poolOpen, poolQ]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoadingConvs(true);
        const { items, nextCursor } = await api.listConversations();
        if (!mounted) return;
        setConversations(items);
        setConvCursor(nextCursor);
        if (items.length && !activeId) setActiveId(items[0].id);
      } finally {
        if (mounted) setLoadingConvs(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!activeId) return;
    let mounted = true;
    (async () => {
      try {
        setLoadingMsgs(true);
        await api.markRead(activeId);
        const { items } = await api.getMessages(activeId);
        if (!mounted) return;
        setMessages(items);
        // scroll to bottom after load
        setTimeout(() => listRef.current?.scrollTo({ top: 1e9, behavior: "smooth" }), 50);
      } finally {
        if (mounted) setLoadingMsgs(false);
      }
    })();
    return () => { mounted = false; };
  }, [activeId]);

  async function handleSend() {
    if (!activeId || !text.trim()) return;
    const content = text.trim();
    setText("");
    // optimistic add
    setMessages((curr) => [
      ...curr,
      {
        id: `tmp-${Date.now()}`,
        conversationId: activeId,
        type: "chat",
        body: content,
        sender: "admin",
        createdAt: new Date().toISOString(),
        read: true,
      },
    ]);
    try {
      setSending(true);
      await api.sendMessage(activeId, content);
      const { items } = await api.getMessages(activeId);
      setMessages(items);
      setTimeout(() => listRef.current?.scrollTo({ top: 1e9, behavior: "smooth" }), 25);
    } finally {
      setSending(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <section className="h-screen w-full bg-gradient-to-br from-purple-700 via-indigo-700 to-blue-700">
      <div className="mx-auto h-full max-w-[1400px] grid grid-cols-[320px_1fr] lg:grid-cols-[360px_1fr] border border-neutral-200 rounded-2xl overflow-hidden shadow-sm bg-white">
        {/* Sidebar */}
        <aside className="min-h-0 flex flex-col border-r border-neutral-200 bg-white">
          <div className="p-4 border-b border-neutral-200">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="size-8 rounded-xl bg-neutral-900" />
                <h1 className="text-lg font-semibold tracking-tight">Inbox</h1>
              </div>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            <ul className="divide-y divide-neutral-200">
              {conversations.map((c) => (
                <li key={c.id} className={`cursor-pointer hover:bg-neutral-50 ${activeId === c.id ? "bg-neutral-50" : ""}`}>
                  <button className="w-full text-left" onClick={() => setActiveId(c.id)}>
                    <div className="flex items-start gap-3 p-4">
                      <div className="size-10 rounded-lg bg-neutral-200" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            {c.unreadCount > 0 && (
                              <span className="inline-block size-2 shrink-0 rounded-full bg-blue-600" aria-label="Unread" />
                            )}
                            <p className="truncate font-medium text-neutral-800">{c.title}</p>
                          </div>
                          <time className="shrink-0 text-xs text-neutral-500">
                            {new Date(c.lastMessageAt).toLocaleDateString()}
                          </time>
                        </div>
                      </div>
                    </div>
                  </button>
                </li>
              ))}
              {!conversations.length && !loadingConvs && (
                <li className="p-4 text-sm text-neutral-500">No conversations.</li>
              )}
            </ul>
          </div>
        </aside>

        {/* Conversation pane */}
        <main className="min-h-0 flex flex-col bg-neutral-25">
          <header className="flex items-center justify-between gap-4 border-b border-neutral-200 px-6 py-4 bg-white">
            <div className="flex items-center gap-3 min-w-0">
              <div className="size-10 rounded-lg bg-neutral-200" />
              <div className="min-w-0">
                <h2 className="truncate font-semibold leading-tight">{activeConv?.title ?? "Select a conversation"}</h2>
              </div>
            </div>
            <div className="shrink-0">
              {typeof window !== 'undefined' && (
                // Lazy load to avoid SSR issues with window/Notification
                dynamic(() => import('./EnablePush'), { ssr: false }) as any
              )}
            </div>
          </header>

          <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto bg-neutral-50 px-6 pt-6 pb-28 overscroll-contain">
            {activeId ? (
              <div className="space-y-4">
                {messages.map((m) => (
                  <div key={m.id} className={`flex items-start gap-3 ${m.sender === "admin" ? "justify-end" : ""}`}>
                    {/* Incoming avatar/icon */}
                    {m.sender !== "admin" && (
                      <div className="size-8 rounded-lg bg-neutral-200 text-neutral-600 flex items-center justify-center" title="User">
                        <svg className="size-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                          <path d="M12 12c2.761 0 5-2.239 5-5S14.761 2 12 2 7 4.239 7 7s2.239 5 5 5zm0 2c-4.418 0-8 2.015-8 4.5V21h16v-2.5c0-2.485-3.582-4.5-8-4.5z" />
                        </svg>
                      </div>
                    )}
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-3 shadow-xs border ${
                        m.sender === "admin"
                          ? "bg-gradient-to-br from-purple-600 via-indigo-600 to-blue-600 text-white rounded-tr-md border-transparent"
                          : "bg-white rounded-tl-md border-neutral-200"
                      }`}
                    >
                      {m.sender === "admin" ? (
                        <div className="rounded-xl bg-white/95 text-neutral-900 px-3 py-2 shadow-xs">
                          <div className="text-sm whitespace-pre-wrap">{m.body}</div>
                        </div>
                      ) : (
                        <div className="text-sm whitespace-pre-wrap">{m.body}</div>
                      )}
                      <div className={`mt-2 flex items-center gap-3 text-xs ${m.sender === "admin" ? "justify-end text-neutral-200" : "text-neutral-500"}`}>
                        <span>{new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                      </div>
                    </div>
                    {/* Outgoing avatar/icon */}
                    {m.sender === "admin" && (
                      <div className="size-8 rounded-lg bg-neutral-900 text-white flex items-center justify-center" title="Admin">
                        <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                          <path d="M12 3l7 4v6c0 5-3.5 9-7 10-3.5-1-7-5-7-10V7l7-4z" />
                          <path d="M9.5 12.5l2 2 4-4" />
                        </svg>
                      </div>
                    )}
                  </div>
                ))}
                {!messages.length && !loadingMsgs && (
                  <p className="text-sm text-neutral-500">No messages yet. Say hi!</p>
                )}
              </div>
            ) : (
              <p className="text-sm text-neutral-500">Select a conversation to view messages.</p>
            )}
          </div>

          {/* Composer */}
          <footer className="sticky bottom-0 inset-x-0 border-t bg-white/95 supports-[backdrop-filter]:bg-white/75 backdrop-blur px-6 py-3">
            <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] items-end gap-3">
              <div className="flex-1 min-w-0">
                <div className="rounded-2xl border border-neutral-200 bg-white px-4 py-2 focus-within:ring-2 focus-within:ring-neutral-900 max-w-full">
                  <textarea
                    ref={taRef}
                    rows={1}
                    placeholder={activeId ? "Type your message…" : "Select a conversation to start messaging…"}
                    className="w-full resize-none bg-transparent outline-none max-h-[120px] min-h-[1.5rem] overflow-y-auto"
                    disabled={!activeId || sending}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onInput={(e) => autoGrow(e.currentTarget)}
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
                    const url = prompt("Insert link URL");
                    if (!url) return;
                    const label = prompt("Link text (optional)") || url;
                    setText((t) => `${t}${t.endsWith("\n") || t.length === 0 ? "" : "\n"}[${label}](${url})`);
                  }}
                >Insert link</button>
                <button
                  className="rounded border border-neutral-200 px-2 py-1 hover:bg-neutral-50"
                  type="button"
                  onClick={() => {
                    const url = prompt("Insert image URL");
                    if (!url) return;
                    const alt = prompt("Alt text (optional)") || "";
                    setText((t) => `${t}${t.endsWith("\n") || t.length === 0 ? "" : "\n"}![${alt}](${url})`);
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
                        fd.append("file", f);
                        const res = await fetch("/api/uploads", { method: "POST", body: fd });
                        const d = await res.json();
                        if (res.ok && d?.ok && d.url) {
                          setText((t) => `${t}${t.endsWith("\n") || t.length === 0 ? "" : "\n"}![](${d.url})`);
                        } else {
                          alert("Upload failed");
                        }
                      } catch (err) {
                        alert("Upload error");
                      } finally {
                        if (fileInputRef.current) fileInputRef.current.value = "";
                      }
                    }}
                  />
                  <label htmlFor="image-upload" className="rounded border border-neutral-200 px-2 py-1 hover:bg-neutral-50 cursor-pointer">Upload image</label>
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
                            {poolResults.map((p: any) => (
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
                        }}
                      >Intro + MOQ ask</button>
                      <button
                        className="block w-full rounded px-2 py-1 text-left hover:bg-neutral-50"
                        onClick={() => {
                          setText((t) => `${t}${t && !t.endsWith('\n') ? '\n' : ''}Shipping: We consolidate and ship after MOQ is met. Typical lead time is 10–21 days depending on lane. Duties/taxes may apply.`);
                        }}
                      >Shipping & lead time</button>
                      <button
                        className="block w-full rounded px-2 py-1 text-left hover:bg-neutral-50"
                        onClick={() => {
                          setText((t) => `${t}${t && !t.endsWith('\n') ? '\n' : ''}Pricing: Unit price reflects factory quote at current MOQ. Larger commitments can reduce price. Reply with your target and we can optimize.`);
                        }}
                      >Pricing notes</button>
                      <button
                        className="block w-full rounded px-2 py-1 text-left hover:bg-neutral-50"
                        onClick={() => {
                          setText((t) => `${t}${t && !t.endsWith('\n') ? '\n' : ''}Thanks! If you want to proceed, reply here with your desired quantity and address and I’ll set everything up.`);
                        }}
                      >Thanks + CTA</button>
                    </div>
                  )}
                </div>
              </div>
              <div className="col-span-1 md:col-span-2 pt-[env(safe-area-inset-bottom)]" />
            </div>
          </footer>
        </main>
      </div>
    </section>
  );
}
