import { createClient } from "@/lib/supabase/server";

export type BehavioralEventType =
    | "session_started"
    | "session_completed"
    | "session_missed"
    | "quest_overdue"
    | "inactivity"
    | "reschedule_abandoned";

export async function recordBehavioralEvent(
    userId: string,
    type: BehavioralEventType,
    metadata: Record<string, unknown> = {}
) {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from("behavioral_events")
        .insert({
            user_id: userId,
            type,
            occurred_at: new Date().toISOString(),
            metadata,
        })
        .select()
        .single();

    if (error) {
        console.error(
            "Failed to record behavioral event:",
            error
        );

        return {
            data: null,
            error,
        };
    }

    return {
        data,
        error: null,
    };
}