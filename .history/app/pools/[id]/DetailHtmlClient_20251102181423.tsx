"use client";

import { useEffect, useMemo, useState } from "react";

/**
 * Renders sanitized provider detail HTML (from /api/external/detail-html?src=...) as a collapsible fallback.
 * - Loads on first expand (lazy) to avoid unnecessary work.
 * - Only attempts fetch when a valid src URL is provided.
 */
export default function DetailHtmlClient({ src, autoOpen = false }: { src?: string | null; autoOpen?: boolean }) {
  const [open, setOpen] = useState(Boolean(autoOpen));
  const [loading, setLoading] = useState(false);
  const [html, setHtml] = useState<string>("");
  const [error, setError] = useState<string>("");

  const api = useMemo(() => {
    const s = String(src || "").trim();
    if (!s) return "";
    try {
      // Use relative path; server route handles sanitization and image proxying
      return `/api/external/detail-html?src=${encodeURIComponent(s)}`;
    } catch {
      return "";
    }
  }, [src]);

  useEffect(() => {
    if (!open || !api || html || loading) return;
    setLoading(true);
    (async () => {
      try {
        const resp = await fetch(api, { cache: "no-store" }).catch(() => null);
        if (!resp || !resp.ok) throw new Error(`HTTP ${resp?.status || "fail"}`);
        const data = (await resp.json().catch(() => null)) as any;
        const frag = data && typeof data.html === "string" ? data.html : "";
        setHtml(frag);
      } catch (e: any) {
        setError(e?.message || "Failed to load details");
      } finally {
        setLoading(false);
      }
    })();
  }, [open, api, html, loading]);

  if (!src) return null;

  return (
    <div className="mt-6">
      <details open={open} onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}>
        <summary className="cursor-pointer text-sm font-medium text-gray-900 select-none">
          More details
          <span className="ml-2 text-gray-500 font-normal">(sanitized from supplier page)</span>
        </summary>
        <div className="mt-3 overflow-hidden rounded-xl border border-gray-200 bg-white">
          {loading ? (
            <div className="p-4 text-sm text-gray-600">Loading…</div>
          ) : error ? (
            <div className="p-4 text-sm text-red-600">{error}</div>
          ) : html ? (
            <div className="p-4 prose max-w-none" dangerouslySetInnerHTML={{ __html: html }} />
          ) : (
            <div className="p-4 text-sm text-gray-600">No additional details available.</div>
          )}
        </div>
      </details>
    </div>
  );
}
