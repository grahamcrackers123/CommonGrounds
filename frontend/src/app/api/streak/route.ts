import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

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

export async function GET() {
    const supabase = await createClient();

    // 1. Check authentication
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json(
            { error: "Unauthorized" },
            { status: 401 }
        );
    }

    const today = getManilaDate();

    // 2. Load the user's existing streak
    const { data: existingStreak, error: streakLoadError } =
        await supabase
            .from("user_streaks")
            .select(
                "user_id, current_streak, longest_streak, last_login_date"
            )
            .eq("user_id", user.id)
            .maybeSingle();

    if (streakLoadError) {
        console.error("Streak load error:", streakLoadError);

        return NextResponse.json(
            { error: "Could not load streak" },
            { status: 500 }
        );
    }

    // 3. First login/activity ever
    if (!existingStreak) {
        const { data: newStreak, error: insertError } =
            await supabase
                .from("user_streaks")
                .insert({
                    user_id: user.id,
                    current_streak: 1,
                    longest_streak: 1,
                    last_login_date: today,
                })
                .select(
                    "current_streak, longest_streak, last_login_date"
                )
                .single();

        if (insertError) {
            console.error("Streak creation error:", insertError);

            return NextResponse.json(
                { error: "Could not create streak" },
                { status: 500 }
            );
        }

        return NextResponse.json({
            streak: newStreak,
        });
    }

    // 4. Already recorded today's login
    if (existingStreak.last_login_date === today) {
        return NextResponse.json({
            streak: existingStreak,
        });
    }

    // 5. Check whether yesterday was the last login
    const yesterday = getPreviousDate(today);

    let newCurrentStreak: number;

    if (existingStreak.last_login_date === yesterday) {
        newCurrentStreak = existingStreak.current_streak + 1;
    } else {
        newCurrentStreak = 1;
    }

    const newLongestStreak = Math.max(
        newCurrentStreak,
        existingStreak.longest_streak
    );

    // 6. Save updated streak
    const { data: updatedStreak, error: updateError } =
        await supabase
            .from("user_streaks")
            .update({
                current_streak: newCurrentStreak,
                longest_streak: newLongestStreak,
                last_login_date: today,
                updated_at: new Date().toISOString(),
            })
            .eq("user_id", user.id)
            .select(
                "current_streak, longest_streak, last_login_date"
            )
            .single();

    if (updateError) {
        console.error("Streak update error:", updateError);

        return NextResponse.json(
            { error: "Could not update streak" },
            { status: 500 }
        );
    }

    return NextResponse.json({
        streak: updatedStreak,
    });
}