"use client";
import React, { useEffect, useMemo, useRef, useState, useImperativeHandle, forwardRef } from "react";
import MessageCard from "@/components/MessageCard";

export type AlertType = "group_update" | "shipping" | "promotion" | "system" | "chat";
export type AlertStatus = "unread" | "read";
export interface AlertItem {
  id: string;
  type: AlertType;
  title: string;
  body: string;
  link?: string;
  status: AlertStatus;
  timestamp: string; // ISO
}

const typeMeta: Record<AlertType, { label: string; icon: React.ReactNode; color: string; ctaLabel?: string }> = {
  group_update: {
    label: "Group Updates",
    icon: <span role="img" aria-label="group">🎯</span>,
    color: "text-indigo-600",
    ctaLabel: "View Order",
  },
  shipping: {
    label: "Shipping",
    icon: <span role="img" aria-label="shipping">🚚</span>,
    color: "text-emerald-600",
    ctaLabel: "Track Package",
  },
  promotion: {
    label: "Promotions",
    icon: <span role="img" aria-label="promo">🎁</span>,
    color: "text-blue-600",
    ctaLabel: "Join Group",
  },
  system: {
    label: "System",
    icon: <span role="img" aria-label="system">🛡️</span>,
    color: "text-neutral-700",
    ctaLabel: "Learn More",
  },
  chat: {
    label: "All",
    icon: <span role="img" aria-label="chat">💬</span>,
    color: "text-neutral-700",
  },
};

async function fetchAlerts(userId?: string): Promise<AlertItem[]> {
  const qs = userId ? `?userId=${encodeURIComponent(userId)}` : "";
  const res = await fetch(`/api/alerts${qs}` as any, { cache: "no-store" });
  if (!res.ok) return [];
  const data = await res.json();
  return (data.items as AlertItem[]) || [];
}

interface MessagesFeedProps {
  showHeader?: boolean;
  activeTab?: "all" | AlertType;
  statusFilter?: "all" | AlertStatus;
  refreshIntervalMs?: number;
  onComputedCounts?: (counts: { unreadTotal: number; total: number; perTypeUnread: Partial<Record<AlertType, number>> }) => void;
}

export type MessagesFeedHandle = {
  markAllVisibleAsRead: () => Promise<void>;
};

const DEFAULT_REFRESH = 30000;

const MessagesFeed = forwardRef<MessagesFeedHandle, MessagesFeedProps>(function MessagesFeed(props, ref) {
  const [activeTabState, setActiveTabState] = useState<"all" | AlertType>("all");
  const [statusFilterState, setStatusFilterState] = useState<"all" | AlertStatus>("all");
  const [items, setItems] = useState<AlertItem[]>([]);
  const [userId, setUserId] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);

  const showHeader = props.showHeader !== undefined ? props.showHeader : true;
  const effectiveTab = props.activeTab ?? activeTabState;
  const effectiveStatus = props.statusFilter ?? statusFilterState;
  const intervalMs = props.refreshIntervalMs ?? DEFAULT_REFRESH;

  useEffect(() => {
    mountedRef.current = true;
    // Try to identify current user so alerts are scoped
    fetch('/api/me', { cache: 'no-store' })
      .then(r => r.json())
      .then(d => { if (mountedRef.current) setUserId(d?.user?.id || undefined); })
      .catch(() => { if (mountedRef.current) setUserId(undefined); });

    fetchAlerts()
      .then((it) => {
        if (!mountedRef.current) return;
        setItems(it);
        const perTypeUnread: Partial<Record<AlertType, number>> = it.reduce((acc, cur) => {
          if (cur.status === "unread") acc[cur.type] = (acc[cur.type] || 0) + 1;
          return acc;
        }, {} as Partial<Record<AlertType, number>>);
        props.onComputedCounts?.({ unreadTotal: it.filter((i) => i.status === "unread").length, total: it.length, perTypeUnread });
      })
      .finally(() => { if (mountedRef.current) setLoading(false); });
    return () => { mountedRef.current = false; };
  }, []);

  // Polling for auto-update
  useEffect(() => {
    if (!intervalMs || intervalMs <= 0) return;
    const id = setInterval(() => {
      fetchAlerts(userId)
        .then((it) => {
          if (!mountedRef.current) return;
          setItems(it);
          const perTypeUnread: Partial<Record<AlertType, number>> = it.reduce((acc, cur) => {
            if (cur.status === "unread") acc[cur.type] = (acc[cur.type] || 0) + 1;
            return acc;
          }, {} as Partial<Record<AlertType, number>>);
          props.onComputedCounts?.({ unreadTotal: it.filter((i) => i.status === "unread").length, total: it.length, perTypeUnread });
        })
        .catch(() => {});
    }, intervalMs);
    return () => clearInterval(id);
  }, [intervalMs, userId]);

  const filtered = useMemo(() => {
    let output = items;
    if (effectiveTab !== "all") {
      output = output.filter((i) => i.type === effectiveTab);
    }
    if (effectiveStatus !== "all") {
      output = output.filter((i) => i.status === effectiveStatus);
    }
    return output;
  }, [items, effectiveTab, effectiveStatus]);

  // Imperative handle: mark all visible as read
  useImperativeHandle(ref, () => ({
    async markAllVisibleAsRead() {
      const ids = filtered.filter((i) => i.status === "unread").map((i) => i.id);
      if (ids.length === 0) return;
      // Optimistic update
      setItems((curr) => curr.map((i) => (ids.includes(i.id) ? { ...i, status: "read" } : i)));
      try {
        await fetch("/api/alerts/read", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids }),
        });
      } catch {
        // ignore; keeps optimistic state
      }
    },
  }), [filtered]);

  function tabBtn(tab: "all" | AlertType, label: string) {
    const selected = effectiveTab === tab;
    return (
      <button
        key={tab}
        className={`px-3 py-1.5 rounded-full text-sm ${selected ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"}`}
        onClick={() => setActiveTabState(tab)}
      >
        {label}
      </button>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {showHeader && (
        <nav className="border-b border-neutral-200 px-6 py-3 bg-white sticky top-0 z-10">
          <div className="flex items-center gap-3">
            {/* Left selection to filter */}
            <label className="flex items-center gap-2 text-sm text-neutral-700">
              <span className="hidden sm:inline">Status</span>
              <select
                className="rounded-lg border border-neutral-200 bg-white px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-neutral-900"
                value={statusFilterState}
                onChange={(e) => setStatusFilterState(e.target.value as any)}
              >
                <option value="all">All</option>
                <option value="unread">Unread</option>
                <option value="read">Read</option>
              </select>
            </label>

            <div className="flex items-center gap-2">
              {tabBtn("all", "All")}
              {tabBtn("group_update", typeMeta.group_update.label)}
              {tabBtn("shipping", typeMeta.shipping.label)}
              {tabBtn("promotion", typeMeta.promotion.label)}
              {tabBtn("system", typeMeta.system.label)}
            </div>
          </div>
        </nav>
      )}

      {/* Feed */}
      <div className="flex-1 overflow-y-auto bg-neutral-50 p-6">
        {loading && <div className="text-sm text-neutral-500">Loading…</div>}
        {!loading && filtered.length === 0 && (
          <div className="text-sm text-neutral-500">No messages.</div>
        )}
        <div className="space-y-3">
          {filtered.map((m) => {
            const meta = typeMeta[m.type];
            return (
              <div key={m.id} onClick={() => {
                if (m.status === "unread") {
                  setItems((curr) => curr.map((i) => (i.id === m.id ? { ...i, status: "read" } : i)));
                  fetch("/api/alerts/read", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids: [m.id] }) }).catch(() => {});
                }
              }}>
                <MessageCard
                  icon={meta?.icon}
                  iconColorClass={meta?.color}
                  title={m.title}
                  body={m.body}
                  timestamp={m.timestamp}
                  status={m.status}
                  cta={m.link ? { label: meta?.ctaLabel || "Open", href: m.link } : undefined}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
});

export default MessagesFeed;
