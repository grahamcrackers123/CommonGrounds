import type { SupabaseClient } from "@supabase/supabase-js";

const DUE_SOON_WINDOW_MS = 24 * 60 * 60 * 1000;

type QuestDueSoon = {
    id: string;
    title: string | null;
    deadline: string;
};

const relativeDue = (deadline: string, now: Date) => {
    const hours = Math.round(
        (new Date(deadline).getTime() - now.getTime()) / (60 * 60 * 1000)
    );
    if (hours <= 1) return "in less than an hour";
    if (hours < 24) return `in about ${hours} hours`;
    return "within a day";
};

// Creates one quest_deadline notification per quest due in the next
// 24 hours. A quest keeps its reminder once created (read or not), so
// reading one never triggers an immediate re-reminder.
export async function notifyUpcomingQuestDeadlines(
    supabase: SupabaseClient,
    userId: string
): Promise<{ created: number; error: string | null }> {
    const now = new Date();
    const windowEnd = new Date(now.getTime() + DUE_SOON_WINDOW_MS);

    const { data: quests, error: questsError } = await supabase
        .from("quests")
        .select("id, title, deadline")
        .eq("user_id", userId)
        .neq("status", "completed")
        .gt("deadline", now.toISOString())
        .lte("deadline", windowEnd.toISOString());

    if (questsError) {
        return { created: 0, error: questsError.message };
    }
    if (!quests || quests.length === 0) {
        return { created: 0, error: null };
    }

    const { data: existing, error: existingError } = await supabase
        .from("notifications")
        .select("title")
        .eq("user_id", userId)
        .eq("type", "quest_deadline");

    if (existingError) {
        return { created: 0, error: existingError.message };
    }

    const reminded = new Set(
        (existing ?? []).map((notification) => notification.title)
    );

    let created = 0;
    for (const quest of quests as QuestDueSoon[]) {
        const questTitle = quest.title ?? "Untitled quest";
        const title = `Deadline soon: ${questTitle}`;
        if (reminded.has(title)) continue;

        const { error } = await supabase.rpc("create_notification", {
            _user_id: userId,
            _type: "quest_deadline",
            _title: title,
            _body: `"${questTitle}" is due ${relativeDue(quest.deadline, now)}. Open Quest Calendar to review it.`,
        });
        if (error) {
            return { created, error: error.message };
        }
        created += 1;
    }

    return { created, error: null };
}
