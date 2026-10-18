import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Latest unfinished recovery session, so the UI can offer to resume
// a restart session after a refresh or a closed tab.
export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("recovery_events")
    .select("*")
    .eq("user_id", user.id)
    .or("status.is.null,status.neq.completed")
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ recoveryEvent: data });
}
