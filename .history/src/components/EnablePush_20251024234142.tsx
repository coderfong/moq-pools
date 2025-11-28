"use client";
import React, { useCallback, useMemo, useState } from 'react';
import { initializeApp, getApps } from 'firebase/app';
import { getMessaging, getToken, isSupported } from 'firebase/messaging';

function getFirebaseConfig() {
  const cfg = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  } as const;
  const ok = Object.values(cfg).every(Boolean);
  return ok ? (cfg as any) : null;
}

export default function EnablePush() {
  const [status, setStatus] = useState<'idle'|'enabled'|'denied'|'error'|'unsupported'>('idle');
  const config = useMemo(() => getFirebaseConfig(), []);

  const onEnable = useCallback(async () => {
    try {
      if (!config) { setStatus('unsupported'); return; }
      if (!(await isSupported())) { setStatus('unsupported'); return; }
      if (typeof window === 'undefined' || !('Notification' in window)) { setStatus('unsupported'); return; }
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') { setStatus('denied'); return; }
      if (getApps().length === 0) initializeApp(config);
      const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY as string | undefined;
      const messaging = getMessaging();
      const token = await getToken(messaging, vapidKey ? { vapidKey } : undefined);
      if (!token) { setStatus('error'); return; }
      await fetch('/api/push/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, platform: 'web', userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '' }),
      });
      setStatus('enabled');
    } catch (e) {
      setStatus('error');
    }
  }, [config]);

  if (!config) return null;

  return (
    <button
      type="button"
      className="rounded border border-neutral-200 px-2 py-1 hover:bg-neutral-50 text-xs"
      onClick={onEnable}
      disabled={status === 'enabled'}
      title={status === 'enabled' ? 'Notifications enabled' : 'Enable browser notifications'}
    >
      {status === 'enabled' ? 'Notifications On' : 'Enable notifications'}
    </button>
  );
}
