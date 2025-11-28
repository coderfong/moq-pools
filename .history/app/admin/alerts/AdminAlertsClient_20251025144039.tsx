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
  const [statusFilter, setStatusFilter] = React.useState<'all'|'unread'|'read'|'resolved'|'archived'>('all');
  const [editing, setEditing] = React.useState<any|null>(null);
  const [page, setPage] = React.useState(1);
  const pageSize = 50;

  const filtered = React.useMemo(() => {
    return alerts.filter(a => {
      if (showUnread && String(a.status) !== 'UNREAD') return false;
      if (showPriority && !isPriority(a.title)) return false;
      if (statusFilter !== 'all') {
        const title = String(a.title || '');
        if (statusFilter === 'unread' && String(a.status) !== 'UNREAD') return false;
        if (statusFilter === 'read' && String(a.status) !== 'READ') return false;
        if (statusFilter === 'resolved' && !/^\[RESOLVED\]/i.test(title)) return false;
        if (statusFilter === 'archived' && !/^\[ARCHIVED\]/i.test(title)) return false;
      }
      if (q) {
        const hay = `${a.title} ${a.body} ${a.user?.email || ''}`.toLowerCase();
        if (!hay.includes(q.toLowerCase())) return false;
      }
      return true;
    });
  }, [alerts, showUnread, showPriority, q, statusFilter]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageItems = React.useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page]);

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

  async function bulkAction(action: 'read'|'resolve'|'archive'|'delete') {
    const ids = Object.keys(selected).filter(k => selected[k]);
    if (ids.length === 0) return;
    setBusy(true);
    try {
      const res = await fetch('/api/admin/alerts/update', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, ids })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        if (action === 'delete') {
          setAlerts(prev => prev.filter(a => !ids.includes(a.id)));
        } else if (action === 'read') {
          setAlerts(prev => prev.map(a => ids.includes(a.id) ? { ...a, status: 'READ' } : a));
        } else if (action === 'resolve') {
          setAlerts(prev => prev.map(a => ids.includes(a.id) ? { ...a, status: 'READ', title: a.title?.startsWith('[RESOLVED]')?a.title:`[RESOLVED] ${a.title}` } : a));
        } else if (action === 'archive') {
          setAlerts(prev => prev.map(a => ids.includes(a.id) ? { ...a, status: 'READ', title: a.title?.startsWith('[ARCHIVED]')?a.title:`[ARCHIVED] ${a.title}` } : a));
        }
        setSelected({});
      } else {
        console.error('Bulk action failed', data);
      }
    } finally {
      setBusy(false);
    }
  }

  async function updateAlert(patch: { id: string, title?: string, body?: string, link?: string|null }) {
    setBusy(true);
    try {
      const res = await fetch('/api/admin/alerts/update', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch) });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.alert) {
        setAlerts(prev => prev.map(a => a.id === data.alert.id ? { ...a, ...data.alert } : a));
        setEditing(null);
      } else {
        console.error('Update failed', data);
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
        <select className="rounded-lg border border-neutral-200 px-2 py-1 text-sm" aria-label="Status filter" value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)}>
          <option value="all">All</option>
          <option value="unread">Unread</option>
          <option value="read">Read</option>
          <option value="resolved">Resolved</option>
          <option value="archived">Archived</option>
        </select>
        <input
          className="ml-auto w-full md:w-72 rounded-lg border border-neutral-200 px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-neutral-900"
          placeholder="Search (title, body, email)" value={q} onChange={e => setQ(e.target.value)}
        />
        <div className="ml-auto flex items-center gap-2">
          <button className="rounded-lg border border-neutral-200 px-3 py-1.5 text-sm hover:bg-neutral-50 disabled:opacity-50" disabled={busy} onClick={markSelectedRead}>Mark read</button>
          <button className="rounded-lg border border-neutral-200 px-3 py-1.5 text-sm hover:bg-neutral-50 disabled:opacity-50" disabled={busy} onClick={() => bulkAction('resolve')}>Resolve</button>
          <button className="rounded-lg border border-neutral-200 px-3 py-1.5 text-sm hover:bg-neutral-50 disabled:opacity-50" disabled={busy} onClick={() => bulkAction('archive')}>Archive</button>
          <button className="rounded-lg border border-red-200 px-3 py-1.5 text-sm text-red-700 hover:bg-red-50 disabled:opacity-50" disabled={busy} onClick={() => bulkAction('delete')}>Delete</button>
        </div>
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
              <th className="p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {pageItems.map((a) => {
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
                  <td className="p-2 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <button className="rounded border border-neutral-200 px-2 py-0.5 text-xs hover:bg-neutral-50" onClick={() => setEditing(a)}>View/Edit</button>
                      <button className="rounded border border-neutral-200 px-2 py-0.5 text-xs hover:bg-neutral-50" onClick={() => bulkAction('resolve') && setSelected({ [a.id]: true })}>Resolve</button>
                      <button className="rounded border border-neutral-200 px-2 py-0.5 text-xs hover:bg-neutral-50" onClick={() => bulkAction('archive') && setSelected({ [a.id]: true })}>Archive</button>
                      <button className="rounded border border-red-200 px-2 py-0.5 text-xs text-red-700 hover:bg-red-50" onClick={() => { setSelected({ [a.id]: true }); bulkAction('delete'); }}>Delete</button>
                    </div>
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
      <div className="mt-3 flex items-center justify-between text-sm text-neutral-600">
        <div>Showing {(page-1)*pageSize + 1}–{Math.min(page*pageSize, filtered.length)} of {filtered.length}</div>
        <div className="flex items-center gap-2">
          <button className="rounded border px-2 py-1 disabled:opacity-50" disabled={page<=1} onClick={() => setPage(p => Math.max(1, p-1))}>Prev</button>
          <span>Page {page} / {pageCount}</span>
          <button className="rounded border px-2 py-1 disabled:opacity-50" disabled={page>=pageCount} onClick={() => setPage(p => Math.min(pageCount, p+1))}>Next</button>
        </div>
      </div>

      {editing && (
        <EditModal
          alert={editing}
          onClose={() => setEditing(null)}
          onSave={(patch) => updateAlert(patch)}
        />
      )}
    </div>
  );
}

function EditModal({ alert, onClose, onSave }: { alert: any, onClose: () => void, onSave: (patch: { id: string, title?: string, body?: string, link?: string|null }) => void }) {
  const [title, setTitle] = React.useState<string>(alert?.title || '');
  const [body, setBody] = React.useState<string>(alert?.body || '');
  const [link, setLink] = React.useState<string>(alert?.link || '');
  const [saving, setSaving] = React.useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await onSave({ id: alert.id, title, body, link: link || null });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/30 p-0 sm:p-6">
      <div className="w-full sm:max-w-2xl rounded-t-xl sm:rounded-xl bg-white shadow-lg">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h3 className="text-base font-semibold">View / Edit Alert</h3>
          <button className="rounded border px-2 py-1 text-sm" onClick={onClose}>Close</button>
        </div>
        <div className="p-4 space-y-3">
          <div>
            <label className="block text-sm text-neutral-600 mb-1">Title</label>
            <input className="w-full rounded border border-neutral-200 px-3 py-2 text-sm" value={title} onChange={e => setTitle(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm text-neutral-600 mb-1">Body</label>
            <textarea className="w-full min-h-32 rounded border border-neutral-200 px-3 py-2 text-sm" value={body} onChange={e => setBody(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm text-neutral-600 mb-1">Link</label>
            <input className="w-full rounded border border-neutral-200 px-3 py-2 text-sm" value={link} onChange={e => setLink(e.target.value)} placeholder="https://..." />
          </div>
          <div className="text-xs text-neutral-500">ID: {alert.id}</div>
        </div>
        <div className="flex items-center justify-end gap-2 border-t px-4 py-3">
          <button className="rounded border px-3 py-1.5 text-sm" onClick={onClose}>Cancel</button>
          <button className="rounded bg-neutral-900 text-white px-3 py-1.5 text-sm disabled:opacity-50" disabled={saving} onClick={handleSave}>Save</button>
        </div>
      </div>
    </div>
  );
}
