"use client";
import React from "react";
import { formatDateTimeUTC } from "@/lib/format";

export type MessageCardStatus = "unread" | "read";

export interface MessageCardCTA {
  label: string;
  href: string;
}

export interface MessageCardProps {
  icon?: React.ReactNode;
  iconColorClass?: string;
  title: string;
  body: string;
  timestamp: string | number | Date; // ISO or Date
  status: MessageCardStatus;
  cta?: MessageCardCTA;
}

function formatRelativeOrAbsolute(ts: string | number | Date): string {
  try {
    const d = ts instanceof Date ? ts : new Date(ts);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    if (!isFinite(diffMs)) return formatDateTimeUTC(d);

    const sec = Math.floor(diffMs / 1000);
    const min = Math.floor(sec / 60);
    const hr = Math.floor(min / 60);
    const day = Math.floor(hr / 24);

    if (sec < 60) return `${sec}s ago`;
    if (min < 60) return `${min}m ago`;
    if (hr < 24) return `${hr}h ago`;
    if (day < 7) return `${day}d ago`;
    return formatDateTimeUTC(d);
  } catch {
    try {
      return formatDateTimeUTC(ts as any);
    } catch {
      return typeof ts === "string" ? ts : new Date(ts).toISOString();
    }
  }
}

export default function MessageCard({ icon, iconColorClass, title, body, timestamp, status, cta }: MessageCardProps) {
  const unread = status === "unread";
  return (
    <div className={`rounded-xl border ${unread ? "border-blue-300 bg-white" : "border-neutral-200 bg-white"} p-4 shadow-xs`}>
      <div className="flex items-start gap-3">
        <div className={`text-lg ${iconColorClass || ""}`}>{icon}</div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <p className={`truncate font-semibold ${unread ? "text-neutral-900" : "text-neutral-800"}`}>{title}</p>
            <time className="shrink-0 text-xs text-neutral-500">{formatRelativeOrAbsolute(timestamp)}</time>
          </div>
          <p className={`mt-1 text-sm ${unread ? "text-neutral-700" : "text-neutral-600"}`}>{body}</p>
          <div className="mt-3 flex items-center gap-2">
            {cta && (
              <a href={cta.href} className="inline-flex items-center rounded-lg bg-neutral-900 px-3 py-1.5 text-sm text-white hover:bg-neutral-800">
                {cta.label}
              </a>
            )}
            {unread && <span className="ml-1 inline-block size-2 rounded-full bg-blue-600" aria-label="Unread" />}
          </div>
        </div>
      </div>
    </div>
  );
}
