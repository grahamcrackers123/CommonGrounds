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

  const { friend_id } = await req.json().catch(() => ({}));
  if (!friend_id) return NextResponse.json({ error: "friend_id is required" }, { status: 400 });

  const { data: room } = await supabase
    .from("rooms").select("owner_id, code").eq("id", id).single();
  if (!room || room.owner_id !== user.id)
    return NextResponse.json({ error: "Only the owner can invite" }, { status: 403 });

  const { data: friendship } = await supabase
    .from("friendships")
    .select("id")
    .or(`and(user_id.eq.${user.id},friend_id.eq.${friend_id}),and(user_id.eq.${friend_id},friend_id.eq.${user.id})`)
    .eq("status", "accepted")
    .maybeSingle();
  if (!friendship) return NextResponse.json({ error: "Not friends with this user" }, { status: 403 });

  const { error } = await supabase.rpc("create_notification", {
    _user_id: friend_id,
    _type: "room_invite",
    _title: "Room invite",
    _body: `Join room ${room.code}`,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}