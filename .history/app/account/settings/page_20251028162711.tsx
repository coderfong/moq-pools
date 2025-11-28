import { getServerUser } from '@/lib/auth';
import { getUserPrefs } from '@/lib/userPrefs';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export default async function AccountSettingsPage() {
  const me = await getServerUser();
  const user = me?.ok ? me.user : null;
  if (!user?.id) return notFound();
  const prefs = getUserPrefs(user.id);

  return (
    <div className="space-y-10">
      {/* Account Settings */}
      <section>
        <h2 className="mb-4 text-lg font-semibold">Account Settings</h2>
        <SettingsForm
          initial={{
            name: user.name ?? '',
            email: (user as any).email ?? '',
            phone: (user as any).phone ?? '',
            countryCode: (user as any).countryCode ?? '',
          }}
        />
      </section>

      {/* Notifications & Preferences */}
      <section>
        <h2 className="mb-4 text-lg font-semibold">Notifications & Preferences</h2>
        <PreferencesForm initial={prefs} />
        <p className="mt-2 text-sm text-gray-500">We’ll never spam. Only updates that matter to your orders.</p>
      </section>

      {/* Legal & Data Controls */}
      <section>
        <h2 className="mb-4 text-lg font-semibold">Legal & Data Controls</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <Link href="/privacy" className="rounded border px-3 py-2 hover:bg-gray-50">📄 Privacy Policy</Link>
          <Link href="/terms" className="rounded border px-3 py-2 hover:bg-gray-50">📜 Terms of Service</Link>
          <Link href="/refund-policy" className="rounded border px-3 py-2 hover:bg-gray-50">💳 Refund Policy</Link>
          <Link href="/shipping" className="rounded border px-3 py-2 hover:bg-gray-50">🧾 Shipping Policy</Link>
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <ExportDataButton />
          <DeleteRequestButton />
        </div>
      </section>
    </div>
  );
}

// Client bits
"use client";
import { useState } from 'react';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1 text-sm md:grid-cols-[160px_1fr] md:items-center">
      <span className="text-gray-600">{label}</span>
      {children}
    </label>
  );
}

function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`w-full rounded border px-3 py-2 ${props.className || ''}`} />;
}

function Button(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button {...props} className={`rounded bg-black px-4 py-2 text-white disabled:opacity-50 ${props.className || ''}`}></button>
  );
}

function OutlineButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button {...props} className={`rounded border px-4 py-2 hover:bg-gray-50 disabled:opacity-50 ${props.className || ''}`}></button>
  );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex cursor-pointer items-center gap-3">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4" />
      <span>{label}</span>
    </label>
  );
}

function SettingsForm({ initial }: { initial: { name: string; email: string; phone: string; countryCode: string } }) {
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    const res = await fetch('/api/account/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const j = await res.json();
    setSaving(false);
    setMsg(j?.ok ? 'Saved' : 'Save failed');
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-3">
      <Field label="Name"><TextInput value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
      <Field label="Email"><TextInput type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
      <Field label="Phone"><TextInput value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+65 8123 4567" /></Field>
      <Field label="Country / Region"><TextInput value={form.countryCode} onChange={(e) => setForm({ ...form, countryCode: e.target.value })} placeholder="Singapore" /></Field>
      <div className="flex items-center gap-3">
        <Button disabled={saving} type="submit">Save changes</Button>
        <OutlineButton type="button" onClick={() => alert('Change Password flow to be implemented')}>Change Password</OutlineButton>
        {msg && <span className="text-sm text-gray-600">{msg}</span>}
      </div>
    </form>
  );
}

function PreferencesForm({ initial }: { initial: { pdpaConsent: boolean; notifications: { groupUpdates: boolean; shippingUpdates: boolean; promotions: boolean; platformAnnouncements: boolean } } }) {
  const [pdpa, setPdpa] = useState(initial.pdpaConsent);
  const [n, setN] = useState(initial.notifications);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setMsg(null);
    const res = await fetch('/api/account/preferences', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pdpaConsent: pdpa, notifications: n }),
    });
    const j = await res.json();
    setSaving(false);
    setMsg(j?.ok ? 'Preferences saved' : 'Save failed');
  }

  return (
    <div className="grid gap-3">
      <Toggle checked={pdpa} onChange={setPdpa} label="Receive product updates and promotions" />
      <div className="grid gap-2">
        <Toggle checked={n.groupUpdates} onChange={(v) => setN({ ...n, groupUpdates: v })} label="Group Updates (when MOQ hits)" />
        <Toggle checked={n.shippingUpdates} onChange={(v) => setN({ ...n, shippingUpdates: v })} label="Shipping Updates" />
        <Toggle checked={n.promotions} onChange={(v) => setN({ ...n, promotions: v })} label="Promotions / New Products" />
        <Toggle checked={n.platformAnnouncements} onChange={(v) => setN({ ...n, platformAnnouncements: v })} label="Platform Announcements" />
      </div>
      <div className="flex items-center gap-3">
        <Button disabled={saving} onClick={save}>Save preferences</Button>
        {msg && <span className="text-sm text-gray-600">{msg}</span>}
      </div>
    </div>
  );
}

function ExportDataButton() {
  const [downloading, setDownloading] = useState(false);
  async function handle() {
    setDownloading(true);
    const res = await fetch('/api/account/export', { method: 'GET' });
    const j = await res.json();
    const blob = new Blob([JSON.stringify(j?.data ?? j, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'my-data.json';
    a.click();
    URL.revokeObjectURL(url);
    setDownloading(false);
  }
  return <OutlineButton disabled={downloading} onClick={handle}>Download my data (JSON)</OutlineButton>;
}

function DeleteRequestButton() {
  const [busy, setBusy] = useState(false);
  async function handle() {
    if (!confirm('Request account deletion? This notifies support to process under PDPA/GDPR.')) return;
    setBusy(true);
    await fetch('/api/account/delete-request', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ confirm: true }) });
    setBusy(false);
    alert('Deletion request sent. Our team will reach out to verify and process.');
  }
  return <OutlineButton disabled={busy} onClick={handle}>Request account deletion</OutlineButton>;
}
