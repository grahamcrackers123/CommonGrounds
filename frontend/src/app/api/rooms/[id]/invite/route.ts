import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { pushToUser } from "@/lib/push/send";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { friend_id } = await req.json().catch(() => ({}));

  if (typeof friend_id !== "string" || !UUID_RE.test(friend_id))
    return NextResponse.json({ error: "friend_id is required" }, { status: 400 });

  const { data: room } = await supabase
    .from("rooms").select("owner_id, code, name").eq("id", id).single();
  if (!room || room.owner_id !== user.id)
    return NextResponse.json({ error: "Only the owner can invite" }, { status: 403 });

  const { data: friendship } = await supabase
    .from("friendships")
    .select("id")
    .or(`and(user_id.eq.${user.id},friend_id.eq.${friend_id}),and(user_id.eq.${friend_id},friend_id.eq.${user.id})`)
    .eq("status", "accepted")
    .maybeSingle();
  if (!friendship) return NextResponse.json({ error: "Not friends with this user" }, { status: 403 });

  const inviteBody = `Join "${room.name ?? room.code}" · Code ${room.code}`;

  const { error } = await supabase.rpc("create_notification", {
    _user_id: friend_id,
    _type: "room_invite",
    _title: "Room invite",
    _body: inviteBody,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // mirror in-app notification as a push
  const { data: inviter } = await supabase
    .from("profiles").select("display_name").eq("id", user.id).single();
  await pushToUser(friend_id, "room_invite", {
    title: `${inviter?.display_name ?? "A friend"} invited you to a focus room`,
    body: inviteBody,
  });

  return NextResponse.json({ ok: true });
}