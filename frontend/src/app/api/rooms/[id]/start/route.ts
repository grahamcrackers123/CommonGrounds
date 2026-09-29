import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, goal, linked_task, duration_minutes } = await req.json().catch(() => ({}));

  const updates: Record<string, unknown> = {
    status: "active",
    started_at: new Date().toISOString(),
  };
  if (typeof name === "string" && name.trim()) updates.name = name.trim();
  if (typeof goal === "string" && goal.trim()) updates.goal = goal.trim();
  if (typeof linked_task === "string" && linked_task.trim()) updates.linked_task = linked_task.trim();
  if (typeof duration_minutes === "number" && duration_minutes > 0)
    updates.duration_minutes = duration_minutes;

  const { data, error } = await supabase
    .from("rooms")
    .update(updates)
    .eq("id", id).eq("owner_id", user.id)
    .select("id, status, started_at, duration_minutes");

  if (error) {
    const fallbackUpdates: Record<string, unknown> = {
      status: "active",
      started_at: new Date().toISOString(),
    };
    if (typeof name === "string" && name.trim()) fallbackUpdates.name = name.trim();
    if (typeof duration_minutes === "number" && duration_minutes > 0)
      fallbackUpdates.duration_minutes = duration_minutes;
    const { data: fallback, error: fallbackError } = await supabase
      .from("rooms")
      .update(fallbackUpdates)
      .eq("id", id).eq("owner_id", user.id)
      .select("id, status, started_at, duration_minutes");
    if (fallbackError || !fallback?.length)
      return NextResponse.json(
        { error: fallbackError ? fallbackError.message : "Only the owner can start" },
        { status: fallbackError ? 500 : 403 }
      );
    return NextResponse.json({ room: fallback[0] });
  }

  if (!data?.length) return NextResponse.json({ error: "Only the owner can start" }, { status: 403 });
  return NextResponse.json({ room: data[0] });
}