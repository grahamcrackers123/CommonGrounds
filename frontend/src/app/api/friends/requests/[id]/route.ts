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

  const { action } = await req.json().catch(() => ({}));
  if (action !== "accept" && action !== "reject")
    return NextResponse.json({ error: "action must be 'accept' or 'reject'" }, { status: 400 });

  const query = action === "accept"
    ? supabase.from("friendships").update({ status: "accepted" })
    : supabase.from("friendships").delete();

  const { data, error } = await query
    .eq("id", id).eq("friend_id", user.id).eq("status", "pending")
    .select("id");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data?.length) return NextResponse.json({ error: "Request not found" }, { status: 404 });
  return NextResponse.json({ ok: true, action });
}