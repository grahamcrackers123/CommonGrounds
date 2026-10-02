import type { SupabaseClient } from "@supabase/supabase-js";

export type PromptType =
  | "inactivity"
  | "restart_10min"
  | "schedule_extension"
  | "comeback_reward"
  | "progress_feedback";

export type PromptAction = "accept" | "postpone" | "dismiss";

const SNOOZE_MS = 60 * 60 * 1000; // 1 hour

// placeholder; how long after accept/dismiss before same prompt type can reappear
// currently 1 second
const PROMPT_COOLDOWN_MS = 24 * 60 * 60 * 1000;

export async function createPrompt(
  supabase: SupabaseClient,
  params: {
    userId: string;
    type: PromptType;
    questId?: string;
    payload?: Record<string, unknown>;
  }
) {
    // one prompt at a time
  const { data: existing } = await supabase
    .from("intervention_prompts")
    .select("id, status, snooze_until")
    .eq("user_id", params.userId)
    .in("status", ["pending", "postponed"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) {
    const stillSnoozed =
      existing.status === "postponed" &&
      existing.snooze_until &&
      new Date(existing.snooze_until) > new Date();

    if (existing.status === "pending" || stillSnoozed) {
      return { created: false, prompt: existing };
    }
    // once snooze window passed, revive instead of duplicating
    const { data: revived, error } = await supabase
      .from("intervention_prompts")
      .update({ status: "pending", snooze_until: null })
      .eq("id", existing.id)
      .select()
      .single();
    if (error) throw error;
    return { created: false, prompt: revived };
  }

    const since = new Date(Date.now() - PROMPT_COOLDOWN_MS).toISOString();
    const { data: recent } = await supabase
        .from("intervention_prompts")
        .select("id")
        .eq("user_id", params.userId)
        .eq("type", params.type)
        .in("status", ["accepted", "dismissed"])
        .gte("responded_at", since)
        .limit(1); 

    if (recent && recent.length > 0) {
        return { created: false, prompt: null };
    }

  const { data, error } = await supabase
    .from("intervention_prompts")
    .insert({
      user_id: params.userId,
      type: params.type,
      quest_id: params.questId ?? null,
      payload: params.payload ?? {},
    })
    .select()
    .single();

  if (error) throw error;
  return { created: true, prompt: data };
}

export async function getActivePrompt(supabase: SupabaseClient, userId: string) {
  const { data } = await supabase
    .from("intervention_prompts")
    .select("*")
    .eq("user_id", userId)
    .in("status", ["pending", "postponed"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return null;
  if (data.status === "pending") return data;

  // postponed; only visible again once the snooze has passed
  if (data.snooze_until && new Date(data.snooze_until) <= new Date()) {
    const { data: revived } = await supabase
      .from("intervention_prompts")
      .update({ status: "pending", snooze_until: null })
      .eq("id", data.id)
      .select()
      .single();
    return revived;
  }

  return null;
}

export async function respondToPrompt(
  supabase: SupabaseClient,
  params: { promptId: string; userId: string; action: PromptAction }
) {
  const { data: prompt, error: fetchErr } = await supabase
    .from("intervention_prompts")
    .select("*")
    .eq("id", params.promptId)
    .eq("user_id", params.userId)
    .single();

  if (fetchErr || !prompt) throw new Error("Prompt not found");

  const now = new Date().toISOString();

  if (params.action === "postpone") {
    const { data, error } = await supabase
      .from("intervention_prompts")
      .update({
        status: "postponed",
        snooze_until: new Date(Date.now() + SNOOZE_MS).toISOString(),
        responded_at: now,
      })
      .eq("id", prompt.id)
      .select()
      .single();
    if (error) throw error;
    return { prompt: data, recoveryEvent: null };
  }

  if (params.action === "dismiss") {
    const { data, error } = await supabase
      .from("intervention_prompts")
      .update({ status: "dismissed", responded_at: now })
      .eq("id", prompt.id)
      .select()
      .single();
    if (error) throw error;
    return { prompt: data, recoveryEvent: null };
  }

  // accept
  const { data: updatedPrompt, error: updateErr } = await supabase
    .from("intervention_prompts")
    .update({ status: "accepted", responded_at: now })
    .eq("id", prompt.id)
    .select()
    .single();
  if (updateErr) throw updateErr;

  let recoveryEvent = null;
  if (prompt.type === "restart_10min") {
    const { data: recovery, error: recErr } = await supabase
      .from("recovery_events")
      .insert({
        prompt_id: prompt.id,
        user_id: params.userId,
        quest_id: prompt.quest_id,
        action_type: "restart_10min",
      })
      .select()
      .single();
    if (recErr) throw recErr;
    recoveryEvent = recovery;
  }

  return { prompt: updatedPrompt, recoveryEvent };
}