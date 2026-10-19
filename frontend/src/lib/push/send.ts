import webpush from 'web-push';
import { createAdminClient } from '@/lib/supabase/admin';

// Same values as notifications.type
export type NotificationType =
  | 'quest_deadline'
  | 'focus_reminder'
  | 'risk_flag'
  | 'session_completed' // focus session + quest completion rewards
  | 'friend_request'
  | 'room_invite'
  | 'test';

export type PushPayload = { title: string; body?: string | null; url?: string; tag?: string };

type Result = { sent: number; skipped?: string };
type AdminClient = ReturnType<typeof createAdminClient>;

const PREF_KEY: Partial<Record<NotificationType, string>> = {
  quest_deadline: 'deadlineReminders',
  focus_reminder: 'focusReminders',
  risk_flag: 'burnoutNudges',
  session_completed: 'rewardAlerts',
  friend_request: 'friendInvites',
  room_invite: 'friendInvites',
};

// where tapping the push takes the user
const DEFAULT_URL: Record<NotificationType, string> = {
  quest_deadline: '/questcalendar',
  focus_reminder: '/questcalendar',
  risk_flag: '/dashboard',
  session_completed: '/notification',
  friend_request: '/notification',
  room_invite: '/focusroom',
  test: '/dashboard',
};

let vapidReady = false;
function initWebPush() {
  if (vapidReady) return;
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT!,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  );
  vapidReady = true;
}

// only explicit false in notification_prefs turns a type off
async function isEnabled(admin: AdminClient, userId: string, type: NotificationType) {
  const prefKey = PREF_KEY[type];
  if (!prefKey) return true;
  const { data: profile } = await admin
    .from('profiles')
    .select('notification_prefs')
    .eq('id', userId)
    .single();
  const prefs = profile?.notification_prefs as Record<string, boolean> | null;
  return prefs?.[prefKey] !== false;
}

async function deliverPush(
  admin: AdminClient,
  userId: string,
  type: NotificationType,
  payload: PushPayload
): Promise<Result> {
  const { data: subs } = await admin
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .eq('user_id', userId);
  if (!subs?.length) return { sent: 0, skipped: 'no-subscriptions' };

  initWebPush();
  const message = JSON.stringify({
    title: payload.title,
    body: payload.body ?? '',
    url: payload.url ?? DEFAULT_URL[type],
    tag: payload.tag,
  });

  let sent = 0;
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          message,
          { TTL: 60 * 60 * 6 } // drop if undelivered after 6h
        );
        sent++;
      } catch (err) {
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          await admin.from('push_subscriptions').delete().eq('id', s.id); // expired device
        } else {
          console.error('push failed', status, err);
        }
      }
    })
  );
  return { sent };
}


// Push only. calls right after existing create_notification RPC so
// push mirrors  in-app notif

export async function pushToUser(
  userId: string,
  type: NotificationType,
  payload: PushPayload
): Promise<Result> {
  try {
    const admin = createAdminClient();
    if (!(await isEnabled(admin, userId, type))) return { sent: 0, skipped: 'disabled' };
    return await deliverPush(admin, userId, type, payload);
  } catch (err) {
    console.error('pushToUser failed:', err);
    return { sent: 0, skipped: 'error' };
  }
}

// Inbox row + push, with dedup. Used by the cron route
export async function sendNotification(
  userId: string,
  type: Exclude<NotificationType, 'test'>,
  payload: PushPayload,
  opts: { dedupKey?: string } = {}
): Promise<Result> {
  const admin = createAdminClient();
  if (!(await isEnabled(admin, userId, type))) return { sent: 0, skipped: 'disabled' };

  const { error } = await admin.from('notifications').insert({
    user_id: userId,
    type,
    title: payload.title,
    body: payload.body ?? null,
    dedup_key: opts.dedupKey ?? null,
  });
  if (error) {
    if (error.code === '23505') return { sent: 0, skipped: 'duplicate' };
    throw error;
  }

  return deliverPush(admin, userId, type, payload);
}