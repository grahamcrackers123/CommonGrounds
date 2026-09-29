import { claimDailyBonus, claimDailyLogin, claimDailyMission, type MissionId } from "@/lib/daily";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const type = body?.type;

    let result;
    if (type === "login") {
        result = await claimDailyLogin(supabase, user.id);
    } else if (type === "mission" && typeof body?.mission === "string") {
        result = await claimDailyMission(supabase, user.id, body.mission as MissionId);
    } else if (type === "bonus") {
        result = await claimDailyBonus(supabase, user.id);
    } else {
        return NextResponse.json({ error: "Invalid claim type" }, { status: 400 });
    }

    if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json(result.state);
}
