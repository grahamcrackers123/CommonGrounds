import { recordDailyStreak } from "@/lib/streak";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// GET /api/streak, records today's activity and returns the user's day streak.
export async function GET() {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: streak, error } = await recordDailyStreak(supabase, user.id);

    if (error) {
        return NextResponse.json({ error }, { status: 500 });
    }

    return NextResponse.json({ streak });
}
