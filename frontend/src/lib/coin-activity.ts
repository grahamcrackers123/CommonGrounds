import type { SupabaseClient } from "@supabase/supabase-js";

/*
 * Coin grants are not stored in a single ledger, so this helper
 * sums every source the app records:
 *   - focus sessions (focus_sessions.coins_earned)
 *   - completed quests (quests.reward_coins)
 *   - daily login / mission / bonus claims (behavioral_events metadata)
 *
 * The one-time new-user welcome reward is intentionally excluded
 * because it is a starting grant, not earned progress.
 */

export const DAILY_COIN_EVENT_TYPES = [
    "daily_login",
    "daily_mission",
    "daily_bonus",
];

export type CoinActivity = {
    focusCoins: number;
    questCoins: number;
    dailyCoins: number;
    total: number;
};

export async function getCoinsEarned(
    supabase: SupabaseClient,
    userId: string,
    from?: Date
): Promise<CoinActivity> {
    let sessionsQuery = supabase
        .from("focus_sessions")
        .select("coins_earned, started_at")
        .eq("user_id", userId);

    let questsQuery = supabase
        .from("quests")
        .select("reward_coins, completed_at")
        .eq("user_id", userId)
        .not("completed_at", "is", null);

    let eventsQuery = supabase
        .from("behavioral_events")
        .select("metadata, occurred_at")
        .eq("user_id", userId)
        .in("type", DAILY_COIN_EVENT_TYPES);

    if (from) {
        const fromIso = from.toISOString();
        sessionsQuery = sessionsQuery.gte("started_at", fromIso);
        questsQuery = questsQuery.gte("completed_at", fromIso);
        eventsQuery = eventsQuery.gte("occurred_at", fromIso);
    }

    const [sessionsRes, questsRes, eventsRes] = await Promise.all([
        sessionsQuery,
        questsQuery,
        eventsQuery,
    ]);

    if (sessionsRes.error || questsRes.error || eventsRes.error) {
        console.error(
            "Coin activity lookup error:",
            sessionsRes.error ?? questsRes.error ?? eventsRes.error
        );

        return { focusCoins: 0, questCoins: 0, dailyCoins: 0, total: 0 };
    }

    const focusCoins = (sessionsRes.data ?? []).reduce(
        (sum, row) => sum + (row.coins_earned ?? 0),
        0
    );

    const questCoins = (questsRes.data ?? []).reduce(
        (sum, row) => sum + (row.reward_coins ?? 0),
        0
    );

    const dailyCoins = (eventsRes.data ?? []).reduce((sum, row) => {
        const coins = (row.metadata as { coins?: unknown } | null)?.coins;
        return sum + (typeof coins === "number" ? coins : 0);
    }, 0);

    return {
        focusCoins,
        questCoins,
        dailyCoins,
        total: focusCoins + questCoins + dailyCoins,
    };
}
