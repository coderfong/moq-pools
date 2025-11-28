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
  const [total, setTotal] = React.useState<number>(initialAlerts?.length ?? 0);
  const [showUnread, setShowUnread] = React.useState(false);
  const [showPriority, setShowPriority] = React.useState(false);
  const [q, setQ] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [selected, setSelected] = React.useState<Record<string, boolean>>({});
  const [readFilter, setReadFilter] = React.useState<'all'|'unread'|'read'>('all');
  const [triageFilter, setTriageFilter] = React.useState<'all'|'open'|'resolved'|'archived'>('all');
  const [editing, setEditing] = React.useState<any|null>(null);
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(50);
  const [dateFrom, setDateFrom] = React.useState<string>('');
  const [dateTo, setDateTo] = React.useState<string>('');
  const [autoRefresh, setAutoRefresh] = React.useState(false);
  const [assigneeFilter, setAssigneeFilter] = React.useState<'all'|'assigned'|'unassigned'|'me'|'id'>('all');
  const [assigneeIdFilter, setAssigneeIdFilter] = React.useState<string>('');
  const [assigneeQueryFilter, setAssigneeQueryFilter] = React.useState<string>('');
  const [assigneeLabelFilter, setAssigneeLabelFilter] = React.useState<string>('');
  const [assigneeOptionsFilter, setAssigneeOptionsFilter] = React.useState<Array<{id:string,email:string,name?:string}>>([]);
  const [sortBy, setSortBy] = React.useState<'timestamp'|'priority'|'triage'|'status'>('timestamp');
  const [sortDir, setSortDir] = React.useState<'asc'|'desc'>('desc');

  const filtered = React.useMemo(() => {
    return alerts.filter(a => {
      if (showUnread && String(a.status) !== 'UNREAD') return false;
      if (showPriority && !isPriority(a.title)) return false;
      if (readFilter !== 'all') {
        if (readFilter === 'unread' && String(a.status) !== 'UNREAD') return false;
        if (readFilter === 'read' && String(a.status) !== 'READ') return false;
      }
      if (triageFilter !== 'all') {
        const title = String(a.title || '');
        const tri = (a as any).triageStatus || (title.startsWith('[RESOLVED]')?'RESOLVED':title.startsWith('[ARCHIVED]')?'ARCHIVED':'OPEN');
        if (triageFilter === 'open' && tri !== 'OPEN') return false;
        if (triageFilter === 'resolved' && tri !== 'RESOLVED') return false;
        if (triageFilter === 'archived' && tri !== 'ARCHIVED') return false;
      }
      if (q) {
        const hay = `${a.title} ${a.body} ${a.user?.email || ''}`.toLowerCase();
        if (!hay.includes(q.toLowerCase())) return false;
      }
      return true;
    });
  }, [alerts, showUnread, showPriority, q, readFilter, triageFilter]);

  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const pageItems = alerts;

  async function fetchPage(resetPage?: boolean) {
    const params = new URLSearchParams();
    params.set('page', String(resetPage ? 1 : page));
    params.set('pageSize', String(pageSize));
    if (readFilter === 'unread' || readFilter === 'read') params.set('read', readFilter);
    if (triageFilter !== 'all') params.set('triage', triageFilter);
  if (showPriority) params.set('priority', '1');
    if (assigneeFilter === 'id' && assigneeIdFilter) {
      params.set('assignee', `id:${assigneeIdFilter}`);
    } else if (assigneeFilter !== 'all') {
      params.set('assignee', assigneeFilter);
    }
  if (sortBy) params.set('sortBy', sortBy);
  if (sortDir) params.set('sortDir', sortDir);
    if (q) params.set('q', q);
    if (dateFrom) params.set('from', dateFrom);
    if (dateTo) params.set('to', dateTo);
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/alerts/list?${params.toString()}`);
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.items) {
        setAlerts(data.items);
        setTotal(Number(data.total || 0));
        if (resetPage) setPage(1);
      }
    } finally { setBusy(false); }
  }

  React.useEffect(() => {
    // Refetch when filters or pagination change
    fetchPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, readFilter, triageFilter, assigneeFilter, assigneeIdFilter, sortBy, sortDir, showPriority, q, dateFrom, dateTo]);

  React.useEffect(() => {
    if (!autoRefresh) return;
    const t = setInterval(() => { fetchPage(); }, 30000);
    return () => clearInterval(t);
  }, [autoRefresh]);

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
    if (action === 'delete' && !window.confirm(`Delete ${ids.length} alert(s)? This cannot be undone.`)) return;
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

  async function runActionOnIds(action: 'read'|'resolve'|'archive'|'delete', ids: string[]) {
    if (!ids?.length) return;
    if (action === 'delete' && !window.confirm('Delete this alert? This cannot be undone.')) return;
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
      } else {
        console.error('Action failed', data);
      }
    } finally {
      setBusy(false);
    }
  }

  async function updateAlert(patch: { id: string, title?: string, body?: string, link?: string|null, adminNotes?: string, priority?: boolean }) {
    setBusy(true);
    try {
      const res = await fetch('/api/admin/alerts/update', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch) });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.alert) {
        setAlerts(prev => prev.map(a => a.id === data.alert.id ? { ...a, ...data.alert } : a));
        setEditing(null);
      } else {
        // Fallback: update local state with patch if server did not return updated fields
        setAlerts(prev => prev.map(a => a.id === patch.id ? { ...a, ...patch } : a));
        setEditing(null);
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
        <select className="rounded-lg border border-neutral-200 px-2 py-1 text-sm" aria-label="Read filter" value={readFilter} onChange={e => { setReadFilter(e.target.value as any); setPage(1); }}>
          <option value="all">All (Read)</option>
          <option value="unread">Unread</option>
          <option value="read">Read</option>
        </select>
        <select className="rounded-lg border border-neutral-200 px-2 py-1 text-sm" aria-label="Triage filter" value={triageFilter} onChange={e => { setTriageFilter(e.target.value as any); setPage(1); }}>
          <option value="all">All (Triage)</option>
          <option value="open">Open</option>
          <option value="resolved">Resolved</option>
          <option value="archived">Archived</option>
        </select>
        <input
          className="ml-auto w-full md:w-72 rounded-lg border border-neutral-200 px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-neutral-900"
          placeholder="Search (title, body, email)" value={q} onChange={e => setQ(e.target.value)}
        />
        <select className="rounded-lg border border-neutral-200 px-2 py-1 text-sm" aria-label="Assignee filter" value={assigneeFilter} onChange={e => { const v=e.target.value as any; setAssigneeFilter(v); if(v!=='id'){ setAssigneeIdFilter(''); setAssigneeLabelFilter(''); setAssigneeQueryFilter(''); } setPage(1); }}>
          <option value="all">All assignees</option>
          <option value="unassigned">Unassigned</option>
          <option value="assigned">Assigned</option>
          <option value="me">Assigned to me</option>
          <option value="id">Assignee: specific user…</option>
        </select>
        {assigneeFilter === 'id' && (
          <div className="relative">
            <input
              className="w-56 rounded-lg border border-neutral-200 px-3 py-1.5 text-sm"
              placeholder="Search user (email or name)"
              value={assigneeQueryFilter}
              onChange={async e => {
                const v = e.target.value; setAssigneeQueryFilter(v);
                if (v.length < 2) { setAssigneeOptionsFilter([]); return; }
                try {
                  const res = await fetch(`/api/admin/users/search?q=${encodeURIComponent(v)}`);
                  const data = await res.json().catch(()=>({}));
                  if (res.ok) setAssigneeOptionsFilter(Array.isArray(data.users)?data.users:[]);
                } catch {}
              }}
            />
            {assigneeOptionsFilter.length > 0 && (
              <div className="absolute z-10 mt-1 max-h-56 w-56 overflow-auto rounded border border-neutral-200 bg-white text-sm shadow">
                {assigneeOptionsFilter.map(opt => (
                  <button key={opt.id} type="button" className="block w-full text-left px-3 py-1.5 hover:bg-neutral-50" onClick={() => {
                    setAssigneeIdFilter(opt.id);
                    setAssigneeLabelFilter(opt.email || opt.name || opt.id);
                    setAssigneeOptionsFilter([]);
                    setAssigneeQueryFilter(opt.email || opt.name || opt.id);
                    setPage(1);
                  }}>
                    <div className="font-medium">{opt.email || opt.name}</div>
                    {opt.name && <div className="text-xs text-neutral-500">{opt.name}</div>}
                  </button>
                ))}
              </div>
            )}
            {assigneeIdFilter && (
              <div className="mt-1 text-xs text-neutral-600">Selected: {assigneeLabelFilter} <button type="button" className="ml-2 underline" onClick={()=>{ setAssigneeIdFilter(''); setAssigneeLabelFilter(''); setAssigneeQueryFilter(''); setAssigneeFilter('all'); setPage(1); }}>Clear</button></div>
            )}
          </div>
        )}
        <select className="rounded-lg border border-neutral-200 px-2 py-1 text-sm" aria-label="Sort by" value={sortBy} onChange={e => { setSortBy(e.target.value as any); setPage(1); }}>
          <option value="timestamp">Sort: Newest</option>
          <option value="priority">Sort: Priority</option>
          <option value="triage">Sort: Triage</option>
          <option value="status">Sort: Read</option>
        </select>
        <select className="rounded-lg border border-neutral-200 px-2 py-1 text-sm" aria-label="Sort direction" value={sortDir} onChange={e => { setSortDir(e.target.value as any); setPage(1); }}>
          <option value="desc">Desc</option>
          <option value="asc">Asc</option>
        </select>
        <input type="date" aria-label="From date" className="rounded-lg border border-neutral-200 px-2 py-1 text-sm" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1); }} />
        <input type="date" aria-label="To date" className="rounded-lg border border-neutral-200 px-2 py-1 text-sm" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1); }} />
        <div className="ml-auto flex items-center gap-2">
          <button className="rounded-lg border border-neutral-200 px-3 py-1.5 text-sm hover:bg-neutral-50 disabled:opacity-50" disabled={busy} onClick={markSelectedRead}>Mark read</button>
          <button className="rounded-lg border border-neutral-200 px-3 py-1.5 text-sm hover:bg-neutral-50 disabled:opacity-50" disabled={busy} onClick={() => bulkAction('resolve')}>Resolve</button>
          <button className="rounded-lg border border-neutral-200 px-3 py-1.5 text-sm hover:bg-neutral-50 disabled:opacity-50" disabled={busy} onClick={() => bulkAction('archive')}>Archive</button>
          <button className="rounded-lg border border-red-200 px-3 py-1.5 text-sm text-red-700 hover:bg-red-50 disabled:opacity-50" disabled={busy} onClick={() => bulkAction('delete')}>Delete</button>
          <button className="rounded-lg border border-neutral-200 px-3 py-1.5 text-sm hover:bg-neutral-50" onClick={() => fetchPage()}>Refresh</button>
          <label className="inline-flex items-center gap-1 text-sm"><input type="checkbox" checked={autoRefresh} onChange={e => setAutoRefresh(e.target.checked)} /> Auto</label>
          <select className="rounded-lg border border-neutral-200 px-2 py-1 text-sm" aria-label="Page size" value={pageSize} onChange={e => { setPageSize(parseInt(e.target.value,10)); setPage(1); }}>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
            <option value={200}>200</option>
          </select>
          <a className="rounded-lg border border-neutral-200 px-3 py-1.5 text-sm hover:bg-neutral-50" href={`#/`} onClick={(ev) => { ev.preventDefault(); const p = new URLSearchParams(); if(readFilter!=='all'){p.set('read',readFilter);} if(triageFilter!=='all'){p.set('triage',triageFilter);} if(assigneeFilter==='id' && assigneeIdFilter){p.set('assignee',`id:${assigneeIdFilter}`);} else if(assigneeFilter!=='all'){p.set('assignee',assigneeFilter);} if(showPriority) p.set('priority','1'); if(q) p.set('q', q); if(dateFrom) p.set('from', dateFrom); if(dateTo) p.set('to', dateTo); const url = `/api/admin/alerts/export?${p.toString()}`; window.open(url, '_blank'); }}>Export CSV</a>
        </div>
      </div>
      <div className="mt-3 overflow-hidden rounded-xl border border-neutral-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 text-neutral-600">
            <tr>
              <th className="p-2 w-8">
                <input aria-label="Select all on page" type="checkbox" checked={alerts.length>0 && alerts.every(a => selected[a.id])} onChange={e => {
                  const checked = e.target.checked; const copy = { ...selected }; alerts.forEach(a => { copy[a.id] = checked; }); setSelected(copy);
                }} />
              </th>
              <th className="p-2">When</th>
              <th className="p-2">Read</th>
              <th className="p-2">Triage</th>
              <th className="p-2">Priority</th>
              <th className="p-2">Category</th>
              <th className="p-2">Title</th>
              <th className="p-2">User</th>
              <th className="p-2">Assignee</th>
              <th className="p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {pageItems.map((a) => {
              const pri = (a as any).priority === true || isPriority(a.title);
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
                  <td className="p-2">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs ${((a as any).triageStatus==='RESOLVED')?'bg-emerald-100 text-emerald-800':((a as any).triageStatus==='ARCHIVED')?'bg-neutral-100 text-neutral-700':'bg-blue-100 text-blue-800'}`}>
                      {(a as any).triageStatus || (String(a.title).startsWith('[RESOLVED]')?'RESOLVED':String(a.title).startsWith('[ARCHIVED]')?'ARCHIVED':'OPEN')}
                    </span>
                  </td>
                  <td className="p-2">{pri ? <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-800">PRIORITY</span> : '-'}</td>
                  <td className="p-2">{cat || '-'}</td>
                  <td className="p-2">
                    <div className="font-medium text-neutral-900">{a.title}</div>
                    <div className="mt-1 text-neutral-700 whitespace-pre-wrap">{a.body}</div>
                    {a.adminNotes && <div className="mt-1 text-xs italic text-neutral-500">Admin notes: {a.adminNotes}</div>}
                    {a.link && <a className="mt-1 inline-block text-neutral-600 underline decoration-dotted" href={a.link}>Open</a>}
                  </td>
                  <td className="p-2">
                    <div>{a.user?.email || '—'}</div>
                    {a.user?.name && <div className="text-neutral-500">{a.user.name}</div>}
                  </td>
                  <td className="p-2">
                    <div>{(a as any).assignee?.email || '—'}</div>
                    {(a as any).assignee?.name && <div className="text-neutral-500">{(a as any).assignee.name}</div>}
                  </td>
                  <td className="p-2 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <button className="rounded border border-neutral-200 px-2 py-0.5 text-xs hover:bg-neutral-50" onClick={() => setEditing(a)}>View/Edit</button>
                      <button className="rounded border border-blue-200 px-2 py-0.5 text-xs text-blue-700 hover:bg-blue-50" title="Set triage to OPEN" onClick={async () => {
                        await updateAlert({ id: a.id, title: a.title, triageStatus: 'OPEN' as any }); fetchPage();
                      }}>Open</button>
                      <button className="rounded border border-neutral-200 px-2 py-0.5 text-xs hover:bg-neutral-50" onClick={() => runActionOnIds('resolve', [a.id])}>Resolve</button>
                      <button className="rounded border border-neutral-200 px-2 py-0.5 text-xs hover:bg-neutral-50" onClick={() => runActionOnIds('archive', [a.id])}>Archive</button>
                      <button className="rounded border border-red-200 px-2 py-0.5 text-xs text-red-700 hover:bg-red-50" onClick={() => runActionOnIds('delete', [a.id])}>Delete</button>
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
        <div>Showing {(page-1)*pageSize + (alerts.length?1:0)}–{Math.min(page*pageSize, total)} of {total}</div>
        <div className="flex items-center gap-2">
          <button className="rounded border px-2 py-1 disabled:opacity-50" disabled={page<=1} onClick={() => setPage(p => Math.max(1, p-1))}>Prev</button>
          <span>Page {page} / {pageCount}</span>
          <button className="rounded border px-2 py-1 disabled:opacity-50" disabled={page>=pageCount} onClick={() => setPage(p => Math.min(pageCount, p+1))}>Next</button>
          <button className="rounded border px-2 py-1" onClick={async () => {
            const p = new URLSearchParams(); if(readFilter!=='all'){p.set('read',readFilter);} if(triageFilter!=='all'){p.set('triage',triageFilter);} if(assigneeFilter==='id' && assigneeIdFilter){p.set('assignee',`id:${assigneeIdFilter}`);} else if(assigneeFilter!=='all'){p.set('assignee',assigneeFilter);} if(showPriority) p.set('priority','1'); if(q) p.set('q', q); if(dateFrom) p.set('from', dateFrom); if(dateTo) p.set('to', dateTo);
            const res = await fetch(`/api/admin/alerts/ids?${p.toString()}`); const data = await res.json().catch(() => ({})); if (res.ok && Array.isArray(data?.ids)) {
              const map: Record<string, boolean> = {}; data.ids.forEach((id: string) => map[id] = true); setSelected(map);
            }
          }}>Select all filtered</button>
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

function EditModal({ alert, onClose, onSave }: { alert: any, onClose: () => void, onSave: (patch: { id: string, title?: string, body?: string, link?: string|null, adminNotes?: string, priority?: boolean, assigneeId?: string|null, triageStatus?: 'OPEN'|'RESOLVED'|'ARCHIVED' }) => void }) {
  const [title, setTitle] = React.useState<string>(alert?.title || '');
  const [body, setBody] = React.useState<string>(alert?.body || '');
  const [link, setLink] = React.useState<string>(alert?.link || '');
  const [adminNotes, setAdminNotes] = React.useState<string>(alert?.adminNotes || '');
  const [priority, setPriority] = React.useState<boolean>(!!alert?.priority);
  const [triageStatus, setTriageStatus] = React.useState<'OPEN'|'RESOLVED'|'ARCHIVED'>((alert?.triageStatus as any) || (String(alert?.title||'').startsWith('[RESOLVED]')?'RESOLVED':String(alert?.title||'').startsWith('[ARCHIVED]')?'ARCHIVED':'OPEN'));
  const [assigneeQuery, setAssigneeQuery] = React.useState<string>('');
  const [assigneeId, setAssigneeId] = React.useState<string|undefined>(alert?.assigneeId);
  const [assigneeLabel, setAssigneeLabel] = React.useState<string>(alert?.assignee?.email || alert?.assignee?.name || '');
  const [assigneeOptions, setAssigneeOptions] = React.useState<Array<{id:string,email:string,name?:string}>>([]);
  const [saving, setSaving] = React.useState(false);

  async function handleSave() {
    setSaving(true);
    try {
  await onSave({ id: alert.id, title, body, link: link || null, adminNotes, priority, assigneeId: assigneeId ?? null, triageStatus });
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
            <input aria-label="Title" title="Title" className="w-full rounded border border-neutral-200 px-3 py-2 text-sm" value={title} onChange={e => setTitle(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm text-neutral-600 mb-1">Body</label>
            <textarea aria-label="Body" title="Body" className="w-full min-h-32 rounded border border-neutral-200 px-3 py-2 text-sm" value={body} onChange={e => setBody(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm text-neutral-600 mb-1">Link</label>
            <input className="w-full rounded border border-neutral-200 px-3 py-2 text-sm" value={link} onChange={e => setLink(e.target.value)} placeholder="https://..." />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-neutral-600 mb-1">Triage status</label>
              <select aria-label="Triage status" className="w-full rounded border border-neutral-200 px-3 py-2 text-sm" value={triageStatus} onChange={e => setTriageStatus(e.target.value as any)}>
                <option value="OPEN">OPEN</option>
                <option value="RESOLVED">RESOLVED</option>
                <option value="ARCHIVED">ARCHIVED</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-neutral-600 mb-1">Assignee</label>
              <input className="w-full rounded border border-neutral-200 px-3 py-2 text-sm" placeholder="Search by email or name" value={assigneeQuery} onChange={async e => {
                const v = e.target.value; setAssigneeQuery(v);
                if (v.length < 2) { setAssigneeOptions([]); return; }
                try {
                  const res = await fetch(`/api/admin/users/search?q=${encodeURIComponent(v)}`);
                  const data = await res.json().catch(()=>({}));
                  if (res.ok) setAssigneeOptions(Array.isArray(data.users)?data.users:[]);
                } catch {}
              }} />
              {assigneeOptions.length > 0 && (
                <div className="mt-1 max-h-48 overflow-auto rounded border border-neutral-200 bg-white text-sm">
                  {assigneeOptions.map(opt => (
                    <button key={opt.id} type="button" className="block w-full text-left px-3 py-1.5 hover:bg-neutral-50" onClick={() => { setAssigneeId(opt.id); setAssigneeLabel(opt.email || opt.name || opt.id); setAssigneeOptions([]); setAssigneeQuery(opt.email || opt.name || opt.id); }}>
                      <div className="font-medium">{opt.email || opt.name}</div>
                      {opt.name && <div className="text-xs text-neutral-500">{opt.name}</div>}
                    </button>
                  ))}
                </div>
              )}
              {assigneeId && (
                <div className="mt-1 text-xs text-neutral-600">Selected: {assigneeLabel} <button type="button" className="ml-2 underline" onClick={()=>{ setAssigneeId(undefined); setAssigneeLabel(''); setAssigneeQuery(''); }}>Clear</button></div>
              )}
            </div>
          </div>
          <div>
            <label className="block text-sm text-neutral-600 mb-1">Admin notes</label>
            <textarea aria-label="Admin notes" title="Admin notes" className="w-full min-h-24 rounded border border-neutral-200 px-3 py-2 text-sm" value={adminNotes} onChange={e => setAdminNotes(e.target.value)} placeholder="Internal notes visible only to admins" />
          </div>
          <label className="inline-flex items-center gap-2 text-sm">
            <input type="checkbox" checked={priority} onChange={e => setPriority(e.target.checked)} />
            Mark as priority
          </label>
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
