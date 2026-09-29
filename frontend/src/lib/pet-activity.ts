import type { SupabaseClient } from "@supabase/supabase-js";

export type PetActivityKind = "equip" | "session" | "quest" | "purchase";

export type PetActivityItem = {
    id: string;
    kind: PetActivityKind;
    title: string;
    detail: string | null;
    at: string;
};

type EventRow = {
    id: string;
    type: string;
    metadata: Record<string, unknown> | null;
    occurred_at: string;
};

type SessionRow = {
    id: string;
    started_at: string | null;
    ended_at: string | null;
    duration_min: number | null;
    streak_xp_earned: number | null;
    pet_energy_earned: number | null;
    coins_earned: number | null;
};

type QuestRow = {
    id: string;
    title: string;
    completed_at: string | null;
    reward_coins: number | null;
};

type UserItemRow = {
    item_key: string;
    source: string | null;
    price_paid: number | null;
    created_at: string;
};

type RewardItemRow = {
    id: string;
    name: string;
};

export function relativeTime(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return "just now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export async function getPetActivity(
    supabase: SupabaseClient,
    userId: string,
    limit = 12
): Promise<PetActivityItem[]> {
    const [eventsRes, sessionsRes, questsRes, itemsRes, rewardItemsRes] = await Promise.all([
        supabase
            .from("behavioral_events")
            .select("id, type, metadata, occurred_at")
            .eq("user_id", userId)
            .in("type", ["pet_equipped", "pet_quest"])
            .order("occurred_at", { ascending: false })
            .limit(40),
        supabase
            .from("focus_sessions")
            .select("id, started_at, ended_at, duration_min, streak_xp_earned, pet_energy_earned, coins_earned")
            .eq("user_id", userId)
            .order("started_at", { ascending: false })
            .limit(20),
        supabase
            .from("quests")
            .select("id, title, completed_at, reward_coins")
            .eq("user_id", userId)
            .not("completed_at", "is", null)
            .order("completed_at", { ascending: false })
            .limit(20),
        supabase
            .from("user_items")
            .select("item_key, source, price_paid, created_at")
            .eq("user_id", userId)
            .order("created_at", { ascending: false })
            .limit(20),
        supabase.from("reward_items").select("id, name"),
    ]);

    const events = (eventsRes.data ?? []) as EventRow[];
    const sessions = (sessionsRes.data ?? []) as SessionRow[];
    const quests = (questsRes.data ?? []) as QuestRow[];
    const userItems = (itemsRes.data ?? []) as UserItemRow[];
    const rewardNames = new Map<string, string>(
        ((rewardItemsRes.data ?? []) as RewardItemRow[]).map((item) => [item.id, item.name])
    );

    const questXp = new Map<string, number>();
    for (const event of events) {
        if (event.type !== "pet_quest") continue;
        const questId = event.metadata?.quest_id;
        const xpGained = event.metadata?.xp_gained;
        if (typeof questId === "string" && typeof xpGained === "number" && xpGained > 0) {
            questXp.set(questId, xpGained);
        }
    }

    const items: PetActivityItem[] = [];

    for (const event of events) {
        if (event.type !== "pet_equipped") continue;
        const itemKey = typeof event.metadata?.item_key === "string" ? event.metadata.item_key : null;
        const name =
            (typeof event.metadata?.item_name === "string" && event.metadata.item_name) ||
            (itemKey ? rewardNames.get(itemKey) : null) ||
            "an item";
        const slot = event.metadata?.slot === "outfit" ? "Outfit" : "Accessory";
        items.push({
            id: `event-${event.id}`,
            kind: "equip",
            title: event.metadata?.equipped === false ? `Took off ${name}` : `Equipped ${name}`,
            detail: slot,
            at: event.occurred_at,
        });
    }

    for (const session of sessions) {
        const minutes = session.duration_min ?? 0;
        if (minutes <= 0 || (!session.started_at && !session.ended_at)) continue;
        const rewards: string[] = [];
        if ((session.streak_xp_earned ?? 0) > 0) rewards.push(`+${session.streak_xp_earned} XP`);
        if ((session.pet_energy_earned ?? 0) > 0) rewards.push(`+${session.pet_energy_earned} energy`);
        if ((session.coins_earned ?? 0) > 0) rewards.push(`+${session.coins_earned} coins`);
        items.push({
            id: `session-${session.id}`,
            kind: "session",
            title: `Completed a ${minutes}m focus session`,
            detail: rewards.length > 0 ? rewards.join(" • ") : null,
            at: (session.ended_at ?? session.started_at) as string,
        });
    }

    for (const quest of quests) {
        if (!quest.completed_at) continue;
        const xpGained = questXp.get(quest.id) ?? 0;
        const rewards: string[] = [];
        if ((quest.reward_coins ?? 0) > 0) rewards.push(`+${quest.reward_coins} coins`);
        if (xpGained > 0) rewards.push(`+${xpGained} XP for your companion`);
        items.push({
            id: `quest-${quest.id}`,
            kind: "quest",
            title: `Completed quest "${quest.title}"`,
            detail: rewards.length > 0 ? rewards.join(" • ") : null,
            at: quest.completed_at,
        });
    }

    for (const item of userItems) {
        const name = rewardNames.get(item.item_key) ?? item.item_key;
        items.push({
            id: `item-${item.item_key}-${item.created_at}`,
            kind: "purchase",
            title: item.source === "starter" ? `Adopted ${name}` : `Unlocked ${name}`,
            detail: (item.price_paid ?? 0) > 0 ? `-${item.price_paid} coins` : null,
            at: item.created_at,
        });
    }

    items.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
    return items.slice(0, limit);
}
