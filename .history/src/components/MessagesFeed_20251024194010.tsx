"use client";
import React, { useEffect, useMemo, useState } from "react";
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

async function fetchAlerts(): Promise<AlertItem[]> {
  const res = await fetch("/api/alerts", { cache: "no-store" });
  if (!res.ok) return [];
  const data = await res.json();
  return (data.items as AlertItem[]) || [];
}

interface MessagesFeedProps {
  showHeader?: boolean;
  activeTab?: "all" | AlertType;
  statusFilter?: "all" | AlertStatus;
  onComputedCounts?: (counts: { unread: number; total: number }) => void;
}

export default function MessagesFeed(props: MessagesFeedProps = {}) {
  const [activeTabState, setActiveTabState] = useState<"all" | AlertType>("all");
  const [statusFilterState, setStatusFilterState] = useState<"all" | AlertStatus>("all");
  const [items, setItems] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);

  const showHeader = props.showHeader !== undefined ? props.showHeader : true;
  const effectiveTab = props.activeTab ?? activeTabState;
  const effectiveStatus = props.statusFilter ?? statusFilterState;

  useEffect(() => {
    let mounted = true;
    fetchAlerts()
      .then((it) => {
        if (!mounted) return;
        setItems(it);
        props.onComputedCounts?.({ unread: it.filter((i) => i.status === "unread").length, total: it.length });
      })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

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
              <MessageCard
                key={m.id}
                icon={meta?.icon}
                iconColorClass={meta?.color}
                title={m.title}
                body={m.body}
                timestamp={m.timestamp}
                status={m.status}
                cta={m.link ? { label: meta?.ctaLabel || "Open", href: m.link } : undefined}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
