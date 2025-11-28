"use client";
import React from 'react';

function isPriority(title?: string | null) {
  return /\[PRIORITY\]/i.test(title || '');
}

function extractCategory(title?: string | null) {
  const m = (title || '').split(':').slice(1).join(':').trim();
  return m || null;
}

function formatDate(dt?: string | Date | null) {
  if (!dt) return '';
  const d = typeof dt === 'string' ? new Date(dt) : dt;
  try { return d.toLocaleString([], { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' }); } catch { return String(d); }
}

export default function AdminAlertsClient({ initialAlerts }: { initialAlerts: any[] }) {
  const [alerts, setAlerts] = React.useState(initialAlerts);
  const [showUnread, setShowUnread] = React.useState(false);
  const [showPriority, setShowPriority] = React.useState(false);
  const [q, setQ] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [selected, setSelected] = React.useState<Record<string, boolean>>({});

  const filtered = React.useMemo(() => {
    return alerts.filter(a => {
      if (showUnread && String(a.status) !== 'UNREAD') return false;
      if (showPriority && !isPriority(a.title)) return false;
      if (q) {
        const hay = `${a.title} ${a.body} ${a.user?.email || ''}`.toLowerCase();
        if (!hay.includes(q.toLowerCase())) return false;
      }
      return true;
    });
  }, [alerts, showUnread, showPriority, q]);

  async function markSelectedRead() {
    const ids = Object.keys(selected).filter(k => selected[k]);
    if (ids.length === 0) return;
    setBusy(true);
    try {
      const res = await fetch('/api/admin/alerts/read', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids })
      });
      if (res.ok) {
        setAlerts(prev => prev.map(a => ids.includes(a.id) ? { ...a, status: 'READ' } : a));
        setSelected({});
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-4">
      <div className="flex flex-wrap items-center gap-2">
        <label className="inline-flex items-center gap-2 text-sm">
          <input aria-label="Filter unread" type="checkbox" checked={showUnread} onChange={e => setShowUnread(e.target.checked)} />
          Unread only
        </label>
        <label className="inline-flex items-center gap-2 text-sm">
          <input aria-label="Filter priority" type="checkbox" checked={showPriority} onChange={e => setShowPriority(e.target.checked)} />
          Priority only
        </label>
        <input
          className="ml-auto w-full md:w-72 rounded-lg border border-neutral-200 px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-neutral-900"
          placeholder="Search (title, body, email)" value={q} onChange={e => setQ(e.target.value)}
        />
        <button
          className="rounded-lg border border-neutral-200 px-3 py-1.5 text-sm hover:bg-neutral-50 disabled:opacity-50"
          disabled={busy}
          onClick={markSelectedRead}
        >Mark selected read</button>
      </div>
      <div className="mt-3 overflow-hidden rounded-xl border border-neutral-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 text-neutral-600">
            <tr>
              <th className="p-2 w-8"></th>
              <th className="p-2">When</th>
              <th className="p-2">Status</th>
              <th className="p-2">Priority</th>
              <th className="p-2">Category</th>
              <th className="p-2">Title</th>
              <th className="p-2">User</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((a) => {
              const pri = isPriority(a.title);
              const cat = extractCategory(a.title);
              return (
                <tr key={a.id} className="border-t border-neutral-100 align-top">
                  <td className="p-2">
                    <input
                      type="checkbox"
                      aria-label={`Select alert ${a.id}`}
                      title="Select alert"
                      checked={!!selected[a.id]}
                      onChange={e => setSelected({ ...selected, [a.id]: e.target.checked })}
                    />
                  </td>
                  <td className="p-2 whitespace-nowrap">{formatDate(a.timestamp)}</td>
                  <td className="p-2">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs ${String(a.status)==='UNREAD'?'bg-amber-100 text-amber-800':'bg-neutral-100 text-neutral-700'}`}>
                      {String(a.status) === 'UNREAD' ? 'UNREAD' : 'READ'}
                    </span>
                  </td>
                  <td className="p-2">{pri ? <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-800">PRIORITY</span> : '-'}</td>
                  <td className="p-2">{cat || '-'}</td>
                  <td className="p-2">
                    <div className="font-medium text-neutral-900">{a.title}</div>
                    <div className="mt-1 text-neutral-700 whitespace-pre-wrap">{a.body}</div>
                    {a.link && <a className="mt-1 inline-block text-neutral-600 underline decoration-dotted" href={a.link}>Open</a>}
                  </td>
                  <td className="p-2">
                    <div>{a.user?.email || '—'}</div>
                    {a.user?.name && <div className="text-neutral-500">{a.user.name}</div>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="p-6 text-sm text-neutral-600">No alerts.</div>
        )}
      </div>
    </div>
  );
}
