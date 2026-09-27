import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limit = Number(new URL(req.url).searchParams.get("limit") ?? 50);

  const { data, error } = await supabase
    .from("focus_sessions")
    .select("*")
    .eq("user_id", user.id)
    .order("started_at", { ascending: false })
    .limit(Math.min(limit, 200));

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ sessions: data });
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body?.started_at || !body?.ended_at || !body?.duration_min) {
    return NextResponse.json(
      { error: "started_at, ended_at, and duration_min are required" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase.rpc("log_focus_session", {
    _started_at: body.started_at,
    _ended_at: body.ended_at,
    _duration_min: body.duration_min,
    _type: body.type ?? "focus",
    _room_id: body.room_id ?? null,
    _id: body.id,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data?.[0], { status: 201 });
}