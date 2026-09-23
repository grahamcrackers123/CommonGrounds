import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { code } = await req.json().catch(() => ({}));
  if (!code) return NextResponse.json({ error: "code is required" }, { status: 400 });

  const { data: found } = await supabase.rpc("search_user_by_code", { _code: code });
  if (!found?.length) return NextResponse.json({ error: "No user found" }, { status: 404 });

  const { data, error } = await supabase
    .from("friendships")
    .insert({ user_id: user.id, friend_id: found[0].id })
    .select("id, status, requested_at")
    .single();

  if (error) {
    if (error.code === "23505")
      return NextResponse.json({ error: "A request or friendship already exists" }, { status: 409 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

    await supabase.rpc("create_notification", {
    _user_id: found[0].id,
    _type: "friend_request",
    _title: "New friend request",
    _body: `${user.user_metadata?.display_name ?? "Someone"} wants to be friends`,
  });
  
  return NextResponse.json({ request: data }, { status: 201 });
}