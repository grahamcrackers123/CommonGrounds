'use client';
import { useEffect, useState } from 'react';
import { Alert, Button, Text } from '@mantine/core';
import { Bell, BellOff, Info } from 'lucide-react';
import { enablePush, disablePush, getPushSupport, type PushSupport } from '@/lib/push/client';

export default function EnablePushButton() {
  const [support, setSupport] = useState<PushSupport>('unsupported');
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSupport(getPushSupport());
    (async () => {
      if (!('serviceWorker' in navigator)) return;
      const reg = await navigator.serviceWorker.getRegistration('/sw.js');
      const sub = await reg?.pushManager.getSubscription();
      setSubscribed(!!sub);
    })();
  }, []);

    function describe(r: { reason?: string; detail?: string }) {
    switch (r.reason) {
      case 'missing-vapid-key':
        return 'Push is not configured on this deployment (missing VAPID public key).';
      case 'denied':
        return 'Notification permission was not granted.';
      case 'server':
        return `The server could not save your device: ${r.detail}`;
      case 'browser':
        return `The browser could not subscribe: ${r.detail}`;
      default:
        return 'Something went wrong. Please try again.';
    }
  }

  async function toggle() {
    setBusy(true);
    setError(null);
    try {
      if (subscribed) {
        await disablePush();
        setSubscribed(false);
      } else {
        const result = await enablePush();
        setSubscribed(result.ok);
        setSupport(getPushSupport());
        if (!result.ok) setError(describe(result));
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (support === 'unsupported')
    return (
      <Alert variant="light" color="gray" icon={<Info size={16} />}>
        Push notifications aren't supported on this browser.
      </Alert>
    );
  if (support === 'needs-install')
    return (
      <Alert variant="light" color="blue" icon={<Info size={16} />} title="Install the app first">
        On iPhone, add CommonGrounds to your Home Screen (Share → Add to Home Screen), then open it from there to turn on notifications.
      </Alert>
    );
  if (support === 'denied')
    return (
      <Alert variant="light" color="orange" icon={<Info size={16} />}>
        Notifications are blocked. Re-enable them in your browser's site settings.
      </Alert>
    );

  return (
    <>
      <Button
        leftSection={subscribed ? <BellOff size={16} /> : <Bell size={16} />}
        variant={subscribed ? 'default' : 'filled'}
        loading={busy}
        onClick={toggle}
      >
        {subscribed ? 'Turn off push notifications' : 'Turn on push notifications'}
      </Button>
      {error && <Text c="red" size="sm" mt="xs">{error}</Text>}
    </>
  );
}