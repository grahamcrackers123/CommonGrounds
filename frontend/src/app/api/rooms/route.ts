import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { duration_minutes, name, goal, linked_task } = await req.json().catch(() => ({}));
  const { data, error } = await supabase.rpc("create_room", {
    _duration: duration_minutes ?? null,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let room = data;
  const extras: Record<string, string> = {};
  if (typeof name === "string" && name.trim()) extras.name = name.trim();
  if (typeof goal === "string" && goal.trim()) extras.goal = goal.trim();
  if (typeof linked_task === "string" && linked_task.trim()) extras.linked_task = linked_task.trim();
  if (data?.id && Object.keys(extras).length > 0) {
    const { error: updateError } = await supabase
      .from("rooms")
      .update(extras)
      .eq("id", data.id);
    if (!updateError) room = { ...data, ...extras };
  }

  return NextResponse.json({ room }, { status: 201 });
}