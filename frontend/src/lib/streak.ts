import type { SupabaseClient } from "@supabase/supabase-js";

export type Streak = {
    current_streak: number;
    longest_streak: number;
    last_login_date: string | null;
};

function getManilaDate(): string {
    return new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Manila",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).format(new Date());
}

function getPreviousDate(dateString: string): string {
    const date = new Date(`${dateString}T00:00:00+08:00`);

    date.setDate(date.getDate() - 1);

    return new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Manila",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).format(date);
}

// Records today's activity and returns the user's day streak: +1 when the
// last activity was yesterday, reset to 1 when a day was missed.
export async function recordDailyStreak(
    supabase: SupabaseClient,
    userId: string
): Promise<{ data: Streak | null; error: string | null }> {
    const today = getManilaDate();

    const { data: existingStreak, error: streakLoadError } = await supabase
        .from("user_streaks")
        .select("user_id, current_streak, longest_streak, last_login_date")
        .eq("user_id", userId)
        .maybeSingle();

    if (streakLoadError) {
        console.error("Streak load error:", streakLoadError);
        return { data: null, error: "Could not load streak" };
    }

    if (!existingStreak) {
        const { data: newStreak, error: insertError } = await supabase
            .from("user_streaks")
            .insert({
                user_id: userId,
                current_streak: 1,
                longest_streak: 1,
                last_login_date: today,
            })
            .select("current_streak, longest_streak, last_login_date")
            .single();

        if (insertError) {
            console.error("Streak creation error:", insertError);
            return { data: null, error: "Could not create streak" };
        }

        return { data: newStreak, error: null };
    }

    if (existingStreak.last_login_date === today) {
        return { data: existingStreak, error: null };
    }

    const yesterday = getPreviousDate(today);

    const newCurrentStreak =
        existingStreak.last_login_date === yesterday
            ? existingStreak.current_streak + 1
            : 1;

    const newLongestStreak = Math.max(
        newCurrentStreak,
        existingStreak.longest_streak
    );

    const { data: updatedStreak, error: updateError } = await supabase
        .from("user_streaks")
        .update({
            current_streak: newCurrentStreak,
            longest_streak: newLongestStreak,
            last_login_date: today,
            updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId)
        .select("current_streak, longest_streak, last_login_date")
        .single();

    if (updateError) {
        console.error("Streak update error:", updateError);
        return { data: null, error: "Could not update streak" };
    }

    return { data: updatedStreak, error: null };
}
