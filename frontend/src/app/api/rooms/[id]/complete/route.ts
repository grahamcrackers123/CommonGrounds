import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// POST /api/rooms/[id]/complete, owner ends the room and records ended_at.
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const endedAt = new Date().toISOString();
  const { data, error } = await supabase
    .from("rooms")
    .update({ status: "ended", ended_at: endedAt })
    .eq("id", id)
    .eq("owner_id", user.id)
    .select("id, status, started_at, duration_minutes");

  if (error) {
    const { data: fallback, error: fallbackError } = await supabase
      .from("rooms")
      .update({ status: "ended" })
      .eq("id", id)
      .eq("owner_id", user.id)
      .select("id, status, started_at, duration_minutes");
    if (fallbackError || !fallback?.length)
      return NextResponse.json(
        { error: fallbackError ? fallbackError.message : "Only the owner can end the room" },
        { status: fallbackError ? 500 : 403 }
      );
    return NextResponse.json({ room: fallback[0] });
  }

  if (!data?.length)
    return NextResponse.json({ error: "Only the owner can end the room" }, { status: 403 });

  return NextResponse.json({ room: data[0] });
}