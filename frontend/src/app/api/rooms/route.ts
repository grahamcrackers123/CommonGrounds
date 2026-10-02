import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));

  const { data, error } = await supabase.rpc("create_room", {
    _duration: body.duration_minutes ?? null,
    _name: body.name ?? null,
    _study_goal: body.goal ?? null,
    _linked_task_id:
      typeof body.linked_task_id === "string" && UUID_RE.test(body.linked_task_id)
        ? body.linked_task_id
        : null,
    _max_participants: body.max_participants ?? 7,
  });

  if (error) {
    const badTask = error.message.includes("linked task not found");
    return NextResponse.json({ error: error.message }, { status: badTask ? 400 : 500 });
  }
  return NextResponse.json({ room: data }, { status: 201 });
}
