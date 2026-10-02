import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase.rpc("get_room_state", { _room_id: id });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Room not found" }, { status: 404 });
  return NextResponse.json(data);
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const updates: Record<string, unknown> = {};
  if (typeof body.name === "string") updates.name = body.name.trim() || null;
  if (typeof body.goal === "string") updates.study_goal = body.goal.trim() || null;
  if (Object.keys(updates).length === 0)
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });

  const { data, error } = await supabase
    .from("rooms")
    .update(updates)
    .eq("id", id)
    .eq("owner_id", user.id)
    .select("id, name, study_goal");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data?.length)
    return NextResponse.json({ error: "Only the owner can edit the room" }, { status: 403 });
  return NextResponse.json({ room: data[0] });
}