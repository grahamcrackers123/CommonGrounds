import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// GET /api/rooms/history, the user's actual focus sessions (with room names), newest first.
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("focus_sessions")
    .select("id, room_id, started_at, ended_at, duration_min, type, rooms(name)")
    .eq("user_id", user.id)
    .order("ended_at", { ascending: false })
    .limit(50);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const history = (data ?? []).map((session: Record<string, unknown>) => {
    const room = (session.rooms ?? null) as { name?: string | null } | null;
    return {
      id: session.id ?? null,
      name: typeof room?.name === "string" ? room.name : null,
      goal: null,
      duration_minutes:
        typeof session.duration_min === "number" ? session.duration_min : null,
      started_at: typeof session.started_at === "string" ? session.started_at : null,
      ended_at: typeof session.ended_at === "string" ? session.ended_at : null,
    };
  });

  return NextResponse.json({ history });
}
