import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { recordBehavioralEvent } from "@/lib/interventions/events";
import { applyXp } from "@/lib/pets/xp";

// placeholder tentative value
const COMEBACK_XP_PLACEHOLDER = 20;

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: recovery, error: recErr } = await supabase
    .from("recovery_events")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (recErr || !recovery) {
    return NextResponse.json({ error: "Recovery event not found" }, { status: 404 });
  }
  if (recovery.status === "completed") {
    return NextResponse.json({ error: "Already completed" }, { status: 409 });
  }

  const { data: pet } = await supabase
    .from("pets")
    .select("id, level, xp")
    .eq("owner_id", user.id)
    .eq("is_active", true)
    .maybeSingle();

  let petXp = null;
  if (pet) {
    petXp = applyXp(pet.level, pet.xp, COMEBACK_XP_PLACEHOLDER);
    const { error: petErr } = await supabase
      .from("pets")
      .update({ level: petXp.level, xp: petXp.xp })
      .eq("id", pet.id);
    if (petErr) {
      return NextResponse.json({ error: petErr.message }, { status: 500 });
    }
  }

  const { data: updated, error: updateErr } = await supabase
    .from("recovery_events")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
      xp_awarded: pet ? COMEBACK_XP_PLACEHOLDER : 0,
    })
    .eq("id", recovery.id)
    .select()
    .single();

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  await recordBehavioralEvent(user.id, "session_completed", {
    source: "restart_10min",
    recovery_event_id: recovery.id,
    prompt_id: recovery.prompt_id,
    quest_id: recovery.quest_id,
  });

  return NextResponse.json({ recoveryEvent: updated, petXp });
}