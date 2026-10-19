import type { SupabaseClient } from "@supabase/supabase-js";
import { recordBehavioralEvent } from "@/lib/interventions/events";

const LOOKBACK_DAYS = 7;
const MISSED_GRACE_MS = 15 * 60 * 1000;
const SESSION_LOOKBACK_BUFFER_MS = 24 * 60 * 60 * 1000;

type ScheduledBlock = {
    id: string;
    quest_id: string | null;
    starts_at: string;
    ends_at: string;
};

type FocusSession = {
    started_at: string | null;
    ended_at: string | null;
    duration_min: number | null;
};

// Records a session_missed behavioral event for every scheduled block
// from the past week that ended without an overlapping focus session.
// Each block is only recorded once; risk evaluation turns two or more
// misses into a restart prompt.
export async function recordMissedSessions(
    supabase: SupabaseClient,
    userId: string
): Promise<{ recorded: number; error: string | null }> {
    const now = new Date();
    const since = new Date(now.getTime() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000);
    const cutoff = new Date(now.getTime() - MISSED_GRACE_MS);

    const [blocksResult, sessionsResult, missedResult] = await Promise.all([
        supabase
            .from("schedule_blocks")
            .select("id, quest_id, starts_at, ends_at")
            .eq("user_id", userId)
            .gte("ends_at", since.toISOString())
            .lt("ends_at", cutoff.toISOString()),
        supabase
            .from("focus_sessions")
            .select("started_at, ended_at, duration_min")
            .eq("user_id", userId)
            .gte(
                "started_at",
                new Date(since.getTime() - SESSION_LOOKBACK_BUFFER_MS).toISOString()
            ),
        supabase
            .from("behavioral_events")
            .select("metadata")
            .eq("user_id", userId)
            .eq("type", "session_missed"),
    ]);

    if (blocksResult.error) {
        return { recorded: 0, error: blocksResult.error.message };
    }
    if (sessionsResult.error) {
        return { recorded: 0, error: sessionsResult.error.message };
    }
    if (missedResult.error) {
        return { recorded: 0, error: missedResult.error.message };
    }

    const blocks = (blocksResult.data ?? []) as ScheduledBlock[];
    const sessions = (sessionsResult.data ?? []) as FocusSession[];

    const alreadyMissed = new Set(
        (missedResult.data ?? []).map(
            (event) =>
                (event.metadata as { schedule_block_id?: string } | null)
                    ?.schedule_block_id
        )
    );

    const missedBlocks = blocks.filter((block) => {
        if (alreadyMissed.has(block.id)) return false;

        const blockStart = new Date(block.starts_at).getTime();
        const blockEnd = new Date(block.ends_at).getTime();
        if (blockEnd <= blockStart) return false;

        return !sessions.some((session) => {
            if (!session.started_at) return false;
            const start = new Date(session.started_at).getTime();
            const end = session.ended_at
                ? new Date(session.ended_at).getTime()
                : start + (session.duration_min ?? 0) * 60000;
            return start < blockEnd && end > blockStart;
        });
    });

    let recorded = 0;
    let error: string | null = null;
    for (const block of missedBlocks) {
        const result = await recordBehavioralEvent(
            userId,
            "session_missed",
            {
                schedule_block_id: block.id,
                quest_id: block.quest_id,
                starts_at: block.starts_at,
                ends_at: block.ends_at,
            },
            block.ends_at
        );
        if (result.error) {
            if (!error) error = result.error.message;
        } else {
            recorded += 1;
        }
    }

    return { recorded, error };
}
