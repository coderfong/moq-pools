"use client";
import React, { useEffect, useMemo, useState } from "react";

type AlertType = "group_update" | "shipping" | "promotion" | "system" | "chat";
type AlertStatus = "unread" | "read";
interface AlertItem {
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

export default function MessagesFeed() {
  const [activeTab, setActiveTab] = useState<"all" | AlertType>("all");
  const [items, setItems] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    fetchAlerts()
      .then((it) => { if (mounted) setItems(it); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  const filtered = useMemo(() => {
    if (activeTab === "all") return items;
    return items.filter((i) => i.type === activeTab);
  }, [items, activeTab]);

  function tabBtn(tab: "all" | AlertType, label: string) {
    const selected = activeTab === tab;
    return (
      <button
        key={tab}
        className={`px-3 py-1.5 rounded-full text-sm ${selected ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"}`}
        onClick={() => setActiveTab(tab)}
      >
        {label}
      </button>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Tabs */}
      <nav className="border-b border-neutral-200 px-6 py-3 bg-white sticky top-0 z-10">
        <div className="flex items-center gap-2">
          {tabBtn("all", "All")}
          {tabBtn("group_update", typeMeta.group_update.label)}
          {tabBtn("shipping", typeMeta.shipping.label)}
          {tabBtn("promotion", typeMeta.promotion.label)}
          {tabBtn("system", typeMeta.system.label)}
        </div>
      </nav>

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
              <div key={m.id} className={`rounded-xl border ${m.status === "unread" ? "border-blue-300 bg-white" : "border-neutral-200 bg-white"} p-4 shadow-xs`}>
                <div className="flex items-start gap-3">
                  <div className={`text-lg ${meta?.color || ""}`}>{meta?.icon}</div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <p className={`truncate font-semibold ${m.status === "unread" ? "text-neutral-900" : "text-neutral-800"}`}>{m.title}</p>
                      <time className="shrink-0 text-xs text-neutral-500">{new Date(m.timestamp).toLocaleString()}</time>
                    </div>
                    <p className={`mt-1 text-sm ${m.status === "unread" ? "text-neutral-700" : "text-neutral-600"}`}>{m.body}</p>
                    <div className="mt-3 flex items-center gap-2">
                      {m.link && (
                        <a href={m.link} className="inline-flex items-center rounded-lg bg-neutral-900 px-3 py-1.5 text-sm text-white hover:bg-neutral-800">
                          {meta?.ctaLabel || "Open"}
                        </a>
                      )}
                      {m.status === "unread" && <span className="ml-1 inline-block size-2 rounded-full bg-blue-600" aria-label="Unread" />}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
