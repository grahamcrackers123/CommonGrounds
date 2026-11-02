'use client';
import {
  disableAllPush,
  disablePush,
  enablePush,
  fetchPushSubscriptions,
  getLocalPushSubscription,
  getPushSupport,
  type PushSubscriptionInfo,
  type PushSupport,
} from '@/lib/push/client';
import { Alert, Button, Flex, Stack, Text } from '@mantine/core';
import { modals } from '@mantine/modals';
import { Bell, BellOff, Info } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';

export default function EnablePushButton() {
  const [support, setSupport] = useState<PushSupport>('unsupported');
  const [subscribed, setSubscribed] = useState(false);
  const [localEndpoint, setLocalEndpoint] = useState<string | null>(null);
  const [serverSubs, setServerSubs] = useState<PushSubscriptionInfo[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const currentSupport = getPushSupport();
      if (!('serviceWorker' in navigator)) {
        if (!cancelled) setSupport(currentSupport);
        return;
      }
      const sub = await getLocalPushSubscription();
      if (cancelled) return;
      setSupport(currentSupport);
      setLocalEndpoint(sub?.endpoint ?? null);
      setSubscribed(!!sub);
      const subs = await fetchPushSubscriptions().catch(() => null);
      if (cancelled || !subs) return;
      setServerSubs(subs);
      setSubscribed(!!sub && subs.some((s) => s.endpoint === sub.endpoint));
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function refreshServerSubs() {
    const subs = await fetchPushSubscriptions().catch(() => []);
    setServerSubs(subs);
  }

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
        setLocalEndpoint(null);
        await refreshServerSubs();
      } else {
        const result = await enablePush();
        setSubscribed(result.ok);
        setSupport(getPushSupport());
        if (!result.ok) {
          setError(describe(result));
        } else {
          const sub = await getLocalPushSubscription();
          setLocalEndpoint(sub?.endpoint ?? null);
          await refreshServerSubs();
        }
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function turnOffAll() {
    setBusy(true);
    setError(null);
    try {
      await disableAllPush();
      setSubscribed(false);
      setLocalEndpoint(null);
      setServerSubs([]);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function confirmTurnOffAll() {
    modals.openConfirmModal({
      title: 'Turn off push on all devices?',
      centered: true,
      children: (
        <Text size="sm">
          This removes push notifications from every browser and device signed in
          to your account.
        </Text>
      ),
      labels: { confirm: 'Turn off everywhere', cancel: 'Cancel' },
      confirmProps: { color: 'red' },
      onConfirm: turnOffAll,
    });
  }

  let status: ReactNode;
  if (support === 'unsupported') {
    status = (
      <Alert variant="light" color="gray" icon={<Info size={16} />}>
        Push notifications aren&apos;t supported on this browser.
      </Alert>
    );
  } else if (support === 'needs-install') {
    status = (
      <Alert variant="light" color="blue" icon={<Info size={16} />} title="Install the app first">
        On iPhone, add CommonGrounds to your Home Screen (Share → Add to Home Screen), then open it from there to turn on notifications.
      </Alert>
    );
  } else if (support === 'denied') {
    status = (
      <Alert variant="light" color="orange" icon={<Info size={16} />}>
        Notifications are blocked. Re-enable them in your browser&apos;s site settings.
      </Alert>
    );
  } else {
    status = (
      <Button
        leftSection={subscribed ? <BellOff size={16} /> : <Bell size={16} />}
        variant={subscribed ? 'default' : 'filled'}
        loading={busy}
        onClick={toggle}
      >
        {subscribed ? 'Turn off push notifications' : 'Turn on push notifications'}
      </Button>
    );
  }

  const otherDeviceCount = serverSubs.filter((s) => s.endpoint !== localEndpoint).length;

  return (
    <Stack gap="xs">
      {status}
      {otherDeviceCount > 0 && (
        <Flex direction='column' gap="xs">
          <Button
            variant="light"
            color="red"
            leftSection={<BellOff size={16} />}
            loading={busy}
            onClick={confirmTurnOffAll}
          >
            Turn off on all devices ({serverSubs.length})
          </Button>
          <Text size="xs" c="dimmed" ta="center">
            Also removes push from other browsers or devices.
          </Text>
        </Flex>
      )}
      {error && <Text c="red" size="sm">{error}</Text>}
    </Stack>
  );
}
