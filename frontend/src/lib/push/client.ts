export type PushSupport = 'unsupported' | 'needs-install' | 'denied' | 'default' | 'granted';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export function getPushSupport(): PushSupport {
  if (typeof window === 'undefined') return 'unsupported';
  const isIOS =
    /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1); // iPadOS
  const standalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true;
  if (isIOS && !standalone) return 'needs-install';
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission;
}

export async function enablePush(): Promise<{ ok: boolean; reason?: string; detail?: string }> {
  const support = getPushSupport();
  if (support === 'unsupported' || support === 'needs-install' || support === 'denied') {
    return { ok: false, reason: support };
  }

  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!vapidKey) return { ok: false, reason: 'missing-vapid-key' };

  const permission = await Notification.requestPermission(); // must run from a click
  if (permission !== 'granted') return { ok: false, reason: 'denied' };

  try {
    const reg = await navigator.serviceWorker.register('/sw.js');
    await navigator.serviceWorker.ready;

    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });
    }

    const res = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sub.toJSON()),
    });
    if (!res.ok) return { ok: false, reason: 'server', detail: `${res.status} ${await res.text()}` };
    return { ok: true };
  } catch (err) {
    return { ok: false, reason: 'browser', detail: (err as Error).message };
  }
}

export async function disablePush() {
  const reg = await navigator.serviceWorker.getRegistration('/sw.js');
  const sub = await reg?.pushManager.getSubscription();
  if (!sub) return;
  await fetch('/api/push/unsubscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ endpoint: sub.endpoint }),
  });
  await sub.unsubscribe();
}