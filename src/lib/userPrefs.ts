import fs from 'node:fs';
import path from 'node:path';

export type NotificationPrefs = {
  groupUpdates: boolean;
  shippingUpdates: boolean;
  promotions: boolean;
  platformAnnouncements: boolean;
};

export type UserPrefs = {
  pdpaConsent: boolean; // Receive product updates and promotions
  notifications: NotificationPrefs;
};

const DEFAULT_PREFS: UserPrefs = {
  pdpaConsent: false,
  notifications: {
    groupUpdates: true,
    shippingUpdates: true,
    promotions: false,
    platformAnnouncements: true,
  },
};

function prefsDir() {
  return path.join(process.cwd(), 'tmp', 'user-preferences');
}

function prefsPath(userId: string) {
  return path.join(prefsDir(), `${userId}.json`);
}

export function getUserPrefs(userId: string): UserPrefs {
  try {
    const dir = prefsDir();
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const fp = prefsPath(userId);
    if (!fs.existsSync(fp)) return DEFAULT_PREFS;
    const raw = fs.readFileSync(fp, 'utf8');
    const parsed = JSON.parse(raw) as Partial<UserPrefs>;
    // Merge with defaults to avoid missing keys
    return {
      pdpaConsent: parsed.pdpaConsent ?? DEFAULT_PREFS.pdpaConsent,
      notifications: {
        groupUpdates: parsed.notifications?.groupUpdates ?? DEFAULT_PREFS.notifications.groupUpdates,
        shippingUpdates: parsed.notifications?.shippingUpdates ?? DEFAULT_PREFS.notifications.shippingUpdates,
        promotions: parsed.notifications?.promotions ?? DEFAULT_PREFS.notifications.promotions,
        platformAnnouncements: parsed.notifications?.platformAnnouncements ?? DEFAULT_PREFS.notifications.platformAnnouncements,
      },
    };
  } catch {
    return DEFAULT_PREFS;
  }
}

export function setUserPrefs(userId: string, prefs: UserPrefs) {
  const dir = prefsDir();
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const fp = prefsPath(userId);
  fs.writeFileSync(fp, JSON.stringify(prefs, null, 2), 'utf8');
}
