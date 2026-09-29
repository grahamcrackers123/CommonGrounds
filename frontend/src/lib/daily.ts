import { addXp } from "@/components/petgrowth";
import type { SupabaseClient } from "@supabase/supabase-js";

export type DailyLoginReward = {
    day: number;
    coins: number;
    xp: number;
    energy: number;
};

export type MissionId = "quest_1" | "focus_25" | "quest_2";

export type DailyMission = {
    id: MissionId;
    title: string;
    description: string;
    target: number;
    unit: string;
    coins: number;
    xp: number;
};

export type DailyMissionState = DailyMission & {
    progress: number;
    complete: boolean;
    claimed: boolean;
};

export type DailyState = {
    login: {
        day: number;
        claimed: boolean;
        rewards: DailyLoginReward[];
    };
    missions: DailyMissionState[];
    bonus: {
        eligible: boolean;
        claimed: boolean;
        coins: number;
        xp: number;
    };
};

export type ClaimResult =
    | { ok: true; state: DailyState }
    | { ok: false; error: string; status: number };

export const DAILY_LOGIN_REWARDS: DailyLoginReward[] = [
    { day: 1, coins: 5, xp: 0, energy: 0 },
    { day: 2, coins: 10, xp: 0, energy: 0 },
    { day: 3, coins: 10, xp: 5, energy: 0 },
    { day: 4, coins: 15, xp: 0, energy: 0 },
    { day: 5, coins: 15, xp: 10, energy: 0 },
    { day: 6, coins: 20, xp: 0, energy: 0 },
    { day: 7, coins: 25, xp: 25, energy: 25 },
];

export const DAILY_MISSIONS: DailyMission[] = [
    {
        id: "quest_1",
        title: "Complete 1 quest",
        description: "Finish any quest from your list today.",
        target: 1,
        unit: "quest",
        coins: 15,
        xp: 10,
    },
    {
        id: "focus_25",
        title: "Focus for 25 minutes",
        description: "Finish at least 25 minutes of focus sessions today.",
        target: 25,
        unit: "min",
        coins: 20,
        xp: 15,
    },
    {
        id: "quest_2",
        title: "Complete 2 quests",
        description: "Finish two quests today.",
        target: 2,
        unit: "quests",
        coins: 15,
        xp: 15,
    },
];

export const DAILY_BONUS = { coins: 50, xp: 30 };

export function localDateKey(date: Date = new Date()): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

export function startOfLocalDay(date: Date = new Date()): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function previousDateKey(date: Date): string {
    const previous = new Date(date);
    previous.setDate(previous.getDate() - 1);
    return localDateKey(previous);
}

async function recordDailyEvent(
    supabase: SupabaseClient,
    userId: string,
    type: string,
    metadata: Record<string, unknown>
) {
    await supabase.from("behavioral_events").insert({
        user_id: userId,
        type,
        occurred_at: new Date().toISOString(),
        metadata,
    });
}

async function awardCoins(supabase: SupabaseClient, userId: string, coins: number) {
    if (coins <= 0) return;
    const { data: profile } = await supabase
        .from("profiles")
        .select("student_coins")
        .eq("id", userId)
        .maybeSingle();
    const current = profile?.student_coins ?? 0;
    await supabase
        .from("profiles")
        .update({ student_coins: current + coins })
        .eq("id", userId);
}

async function awardPet(supabase: SupabaseClient, userId: string, xp: number, energy: number) {
    if (xp <= 0 && energy <= 0) return;
    const { data: pet } = await supabase
        .from("pets")
        .select("id, level, xp, pet_energy")
        .eq("owner_id", userId)
        .maybeSingle();
    if (!pet) return;

    const updates: Record<string, number> = {};
    if (xp > 0) {
        const next = addXp(pet.level ?? 1, pet.xp ?? 0, xp);
        updates.level = next.level;
        updates.xp = next.xp;
    }
    if (energy > 0) {
        updates.pet_energy = Math.min((pet.pet_energy ?? 0) + energy, 100);
    }
    await supabase.from("pets").update(updates).eq("id", pet.id);
}

export async function getDailyState(supabase: SupabaseClient, userId: string): Promise<DailyState> {
    const now = new Date();
    const todayKey = localDateKey(now);
    const yesterdayKey = previousDateKey(now);
    const dayStart = startOfLocalDay(now).toISOString();

    const [loginRes, missionRes, bonusRes, questsRes, sessionsRes] = await Promise.all([
        supabase
            .from("behavioral_events")
            .select("metadata, occurred_at")
            .eq("user_id", userId)
            .eq("type", "daily_login")
            .order("occurred_at", { ascending: false })
            .limit(1)
            .maybeSingle(),
        supabase
            .from("behavioral_events")
            .select("metadata")
            .eq("user_id", userId)
            .eq("type", "daily_mission")
            .gte("occurred_at", dayStart),
        supabase
            .from("behavioral_events")
            .select("id")
            .eq("user_id", userId)
            .eq("type", "daily_bonus")
            .gte("occurred_at", dayStart)
            .limit(1)
            .maybeSingle(),
        supabase
            .from("quests")
            .select("id")
            .eq("user_id", userId)
            .not("completed_at", "is", null)
            .gte("completed_at", dayStart),
        supabase
            .from("focus_sessions")
            .select("duration_min")
            .eq("user_id", userId)
            .gte("started_at", dayStart),
    ]);

    const lastLogin = loginRes.data?.metadata as { date?: string; day?: number } | null;
    let day = 1;
    let claimed = false;
    if (lastLogin?.date === todayKey) {
        claimed = true;
        day = lastLogin.day ?? 1;
    } else if (lastLogin?.date === yesterdayKey) {
        const previousDay = lastLogin.day ?? 0;
        day = previousDay >= DAILY_LOGIN_REWARDS.length ? 1 : previousDay + 1;
    }

    const questsToday = (questsRes.data ?? []).length;
    const focusMinutesToday = (sessionsRes.data ?? []).reduce(
        (sum, session) => sum + (session.duration_min ?? 0),
        0
    );
    const claimedMissions = new Set(
        (missionRes.data ?? []).map((event) => (event.metadata as { mission?: string } | null)?.mission)
    );

    const missions: DailyMissionState[] = DAILY_MISSIONS.map((mission) => {
        const raw = mission.id === "focus_25" ? focusMinutesToday : questsToday;
        const progress = Math.min(raw, mission.target);
        return {
            ...mission,
            progress,
            complete: progress >= mission.target,
            claimed: claimedMissions.has(mission.id),
        };
    });

    const allComplete = missions.every((mission) => mission.complete);

    return {
        login: { day, claimed, rewards: DAILY_LOGIN_REWARDS },
        missions,
        bonus: {
            eligible: allComplete,
            claimed: Boolean(bonusRes.data),
            coins: DAILY_BONUS.coins,
            xp: DAILY_BONUS.xp,
        },
    };
}

export async function claimDailyLogin(supabase: SupabaseClient, userId: string): Promise<ClaimResult> {
    const before = await getDailyState(supabase, userId);
    if (before.login.claimed) {
        return { ok: false, error: "Today's login reward is already claimed.", status: 400 };
    }

    const reward = DAILY_LOGIN_REWARDS[before.login.day - 1] ?? DAILY_LOGIN_REWARDS[0];
    await awardCoins(supabase, userId, reward.coins);
    await awardPet(supabase, userId, reward.xp, reward.energy);
    await recordDailyEvent(supabase, userId, "daily_login", {
        date: localDateKey(),
        day: reward.day,
        coins: reward.coins,
        xp: reward.xp,
        energy: reward.energy,
    });

    return { ok: true, state: await getDailyState(supabase, userId) };
}

export async function claimDailyMission(
    supabase: SupabaseClient,
    userId: string,
    missionId: MissionId
): Promise<ClaimResult> {
    const before = await getDailyState(supabase, userId);
    const mission = before.missions.find((entry) => entry.id === missionId);
    if (!mission) {
        return { ok: false, error: "Unknown mission.", status: 400 };
    }
    if (!mission.complete) {
        return { ok: false, error: "This mission is not complete yet.", status: 400 };
    }
    if (mission.claimed) {
        return { ok: false, error: "This mission reward is already claimed.", status: 400 };
    }

    await awardCoins(supabase, userId, mission.coins);
    await awardPet(supabase, userId, mission.xp, 0);
    await recordDailyEvent(supabase, userId, "daily_mission", {
        date: localDateKey(),
        mission: mission.id,
        coins: mission.coins,
        xp: mission.xp,
    });

    return { ok: true, state: await getDailyState(supabase, userId) };
}

export async function claimDailyBonus(supabase: SupabaseClient, userId: string): Promise<ClaimResult> {
    const before = await getDailyState(supabase, userId);
    if (!before.bonus.eligible) {
        return { ok: false, error: "Complete all three daily missions first.", status: 400 };
    }
    if (before.bonus.claimed) {
        return { ok: false, error: "The daily bonus is already claimed.", status: 400 };
    }

    await awardCoins(supabase, userId, DAILY_BONUS.coins);
    await awardPet(supabase, userId, DAILY_BONUS.xp, 0);
    await recordDailyEvent(supabase, userId, "daily_bonus", {
        date: localDateKey(),
        coins: DAILY_BONUS.coins,
        xp: DAILY_BONUS.xp,
    });

    return { ok: true, state: await getDailyState(supabase, userId) };
}
