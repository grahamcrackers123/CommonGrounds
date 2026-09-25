import type { SupabaseClient } from "@supabase/supabase-js";
import {
  detectMissedSessions,
  detectInactivity,
  detectOverdueQuests,
  detectHighScheduledWorkload,
  type BehavioralEvent,
  type QuestForRisk,
  type ScheduleBlockForRisk,
  type RiskFlag,
} from "@/lib/interventions/risk";

const FLAG_TITLES: Record<string, string> = {
  missed_sessions: "Missed sessions check-in",
  inactivity: "Inactivity check-in",
  overdue_quests: "Overdue coursework check-in",
  high_scheduled_workload: "Heavy schedule check-in",
};

export async function computeRiskFlags(
  supabase: SupabaseClient,
  userId: string
): Promise<{ flags: RiskFlag[]; error: string | null }> {
  const [eventsResult, questsResult, blocksResult] = await Promise.all([
    supabase
      .from("behavioral_events")
      .select("type, occurred_at, metadata")
      .eq("user_id", userId)
      .order("occurred_at", { ascending: false }),
    supabase
      .from("quests")
      .select("deadline, status")
      .eq("user_id", userId)
      .neq("status", "completed"),
    supabase
      .from("schedule_blocks")
      .select("starts_at, ends_at")
      .eq("user_id", userId),
  ]);

  if (eventsResult.error) return { flags: [], error: eventsResult.error.message };
  if (questsResult.error) return { flags: [], error: questsResult.error.message };
  if (blocksResult.error) return { flags: [], error: blocksResult.error.message };

  const events = (eventsResult.data ?? []) as BehavioralEvent[];
  const quests = (questsResult.data ?? []) as QuestForRisk[];
  const blocks = (blocksResult.data ?? []) as ScheduleBlockForRisk[];

  const flags = [
    detectMissedSessions(events),
    detectInactivity(events),
    detectOverdueQuests(quests),
    ...detectHighScheduledWorkload(blocks),
  ].filter((f): f is RiskFlag => f !== null);

  return { flags, error: null };
}

// sends notif for each currently-active flag, but only if an
// unread risk_flag notification doesn't already exist
// once user reads/dismisses it, a still-active flag will notify again
export async function evaluateAndNotifyRisk(
  supabase: SupabaseClient,
  userId: string
) {
  const { flags, error } = await computeRiskFlags(supabase, userId);
  if (error) {
    console.error("Risk evaluation failed:", error);
    return;
  }

  for (const flag of flags) {
    const { data: existing } = await supabase
      .from("notifications")
      .select("id")
      .eq("user_id", userId)
      .eq("type", "risk_flag")
      .eq("read", false)
      .eq("title", FLAG_TITLES[flag.type] ?? "Workload check-in")
      .limit(1);

    if (existing && existing.length > 0) continue;

    await supabase.rpc("create_notification", {
      _user_id: userId,
      _type: "risk_flag",
      _title: FLAG_TITLES[flag.type] ?? "Workload check-in",
      _body: flag.message,
    });
  }
}