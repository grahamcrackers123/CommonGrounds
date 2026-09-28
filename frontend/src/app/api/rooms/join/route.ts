import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { code } = await req.json().catch(() => ({}));
  if (!code) return NextResponse.json({ error: "code is required" }, { status: 400 });

  const { data: roomId, error } = await supabase.rpc("join_room", { _code: code });
  if (error) {
    const notFound = error.message.includes("room not found");
    return NextResponse.json({ error: notFound ? "Room not found" : error.message },
      { status: notFound ? 404 : 500 });
  }
  return NextResponse.json({ room_id: roomId });
}