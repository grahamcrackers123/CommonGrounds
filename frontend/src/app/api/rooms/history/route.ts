import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// GET /api/rooms/history, past focus sessions (rooms that ended) for the user, as owner or participant, newest first.
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: owned, error } = await supabase
    .from("rooms")
    .select("*")
    .eq("owner_id", user.id)
    .eq("status", "ended");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let joined: unknown[] = [];
  try {
    const { data } = await supabase
      .from("room_participants")
      .select("room_id, rooms(*)")
      .eq("user_id", user.id);
    joined = (data ?? [])
      .map((row: { rooms?: unknown }) => row.rooms)
      .filter((room) => (room as { status?: string })?.status === "ended");
  } catch {
    joined = [];
  }

  const seen = new Set<string>();
  const merged = [...(owned ?? []), ...joined].filter((room) => {
    const id = String((room as { id?: unknown }).id ?? "");
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  });

  const history = merged
    .map((room) => {
      const r = room as Record<string, unknown>;
      return {
        id: r.id ?? null,
        name: typeof r.name === "string" ? r.name : null,
        goal: typeof r.goal === "string" ? r.goal : null,
        duration_minutes: typeof r.duration_minutes === "number" ? r.duration_minutes : null,
        started_at: typeof r.started_at === "string" ? r.started_at : null,
        ended_at: typeof r.ended_at === "string" ? r.ended_at : null,
      };
    })
    .sort((a, b) => {
      const ta = a.ended_at ?? a.started_at ?? "";
      const tb = b.ended_at ?? b.started_at ?? "";
      return ta < tb ? 1 : ta > tb ? -1 : 0;
    });

  return NextResponse.json({ history });
}