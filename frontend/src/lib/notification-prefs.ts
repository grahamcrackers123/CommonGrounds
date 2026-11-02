import type { SupabaseClient } from "@supabase/supabase-js";

export type NotificationPrefs = {
  deadlineReminders?: boolean;
  focusReminders?: boolean;
  burnoutNudges?: boolean;
  rewardAlerts?: boolean;
  friendInvites?: boolean;
};

// Same values as notifications.type
export type NotificationType =
  | "quest_deadline"
  | "focus_reminder"
  | "risk_flag"
  | "session_completed" // focus session + quest completion rewards
  | "friend_request"
  | "room_invite"
  | "test";

export const NOTIFICATION_PREF_KEY: Partial<
  Record<NotificationType, keyof NotificationPrefs>
> = {
  quest_deadline: "deadlineReminders",
  focus_reminder: "focusReminders",
  risk_flag: "burnoutNudges",
  session_completed: "rewardAlerts",
  friend_request: "friendInvites",
  room_invite: "friendInvites",
};

// Only an explicit false turns a type off.
export function isNotificationEnabled(
  prefs: NotificationPrefs | null | undefined,
  type: string
): boolean {
  const prefKey = NOTIFICATION_PREF_KEY[type as NotificationType];
  if (!prefKey) return true;
  return prefs?.[prefKey] !== false;
}

export async function loadNotificationPrefs(
  supabase: SupabaseClient,
  userId: string
): Promise<NotificationPrefs> {
  const { data } = await supabase
    .from("profiles")
    .select("notification_prefs")
    .eq("id", userId)
    .maybeSingle();
  return (data?.notification_prefs ?? {}) as NotificationPrefs;
}
