import { getServerUser } from '@/lib/auth';
import { getUserPrefs } from '@/lib/userPrefs';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { SettingsForm, PreferencesForm, ExportDataButton, DeleteRequestButton } from './client-forms';

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
