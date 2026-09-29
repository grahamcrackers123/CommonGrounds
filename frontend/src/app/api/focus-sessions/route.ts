import { createClient } from "@/lib/supabase/server";
import { applyEnergyDecay } from "@/lib/pet-energy";
import { NextResponse } from "next/server";

// POST /api/focus-sessions, record a completed focus session and apply rewards (coins, pet energy, pet XP) via the complete_focus_session RPC.
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Decay any energy lost since the pet was last touched, so session rewards
  // are granted on top of the up-to-date value.
  const { data: pet } = await supabase
    .from("pets")
    .select("id, pet_energy, updated_at")
    .eq("owner_id", user.id)
    .maybeSingle();
  if (pet) await applyEnergyDecay(supabase, pet);

  const body = await req.json().catch(() => ({}));
  const startedAt = typeof body.started_at === "string" ? body.started_at : null;
  const endedAt = typeof body.ended_at === "string" ? body.ended_at : null;
  const durationMin = typeof body.duration_min === "number" ? Math.round(body.duration_min) : null;

  if (!startedAt || !endedAt || !durationMin || durationMin <= 0) {
    return NextResponse.json(
      { error: "started_at, ended_at, and duration_min are required" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase.rpc("complete_focus_session", {
    p_room_id: typeof body.room_id === "string" ? body.room_id : null,
    p_started_at: startedAt,
    p_ended_at: endedAt,
    p_duration_min: durationMin,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const result = data?.[0];
  if (!result) return NextResponse.json({ error: "Session could not be saved" }, { status: 500 });

  await supabase.rpc("create_notification", {
    _user_id: user.id,
    _type: "session_completed",
    _title: "Focus session complete!",
    _body: `You earned ${result.earned_coins ?? 0} coins and ${result.earned_streak_xp ?? 0} XP`,
  });

  return NextResponse.json(
    {
      saved: true,
      coins: result.new_coin_balance ?? null,
      earned: {
        coins: result.earned_coins ?? 0,
        pet_energy: result.earned_pet_energy ?? 0,
        streak_xp: result.earned_streak_xp ?? 0,
      },
      pet: {
        level: result.pet_level ?? null,
        xp: result.pet_xp ?? null,
        leveledUp: result.leveled_up ?? false,
      },
    },
    { status: 201 }
  );
}