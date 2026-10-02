import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const code = new URL(req.url).searchParams.get("code")?.trim();
  if (!code) return NextResponse.json({ error: "code is required" }, { status: 400 });

  const { data, error } = await supabase.rpc("search_user_by_code", { _code: code });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data?.length) return NextResponse.json({ error: "No user found" }, { status: 404 });

  return NextResponse.json({ user: data[0] });
}