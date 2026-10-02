import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const ALLOWED = ["ready", "focus", "break", "completed"];

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { status } = await req.json().catch(() => ({}));
  if (!ALLOWED.includes(status))
    return NextResponse.json({ error: `status must be one of ${ALLOWED.join(", ")}` }, { status: 400 });

  const { data, error } = await supabase
    .from("room_participants")
    .update({ status })
    .eq("room_id", id).eq("user_id", user.id)
    .select("status");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data?.length) return NextResponse.json({ error: "Not a participant" }, { status: 404 });
  return NextResponse.json({ status: data[0].status });
}