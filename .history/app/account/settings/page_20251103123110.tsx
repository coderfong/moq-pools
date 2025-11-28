import { getSession } from '../../api/_lib/session';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { SettingsForm, PreferencesForm, ExportDataButton, DeleteRequestButton } from './client-forms';

export default async function AccountSettingsPage() {
  const session = getSession();
  if (!session?.sub || !prisma) redirect('/login?next=/account/settings');

  const user = await prisma.user.findUnique({
    where: { id: session.sub },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      countryCode: true,
      companyName: true,
      isIndividualBuyer: true,
    },
  });

  if (!user) redirect('/login?next=/account/settings');

  // Get user preferences (using a simple default for now)
  const prefs = {
    emailAlerts: true,
    smsAlerts: false,
    pushAlerts: true,
  };

  return (
    <div className="space-y-10">
      {/* Account Settings */}
      <section>
        <h2 className="mb-4 text-lg font-semibold">Account Settings</h2>
        <SettingsForm
          initial={{
            name: user.name || '',
            email: user.email || '',
            phone: user.phone || '',
            countryCode: user.countryCode || '',
            companyName: user.companyName || '',
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
