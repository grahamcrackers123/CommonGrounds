import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { notifyUpcomingQuestDeadlines } from "@/lib/notifications";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Remind about quests due within a day before listing, so brand
  // new reminders show up in this same response.
  const reminders = await notifyUpcomingQuestDeadlines(supabase, user.id);
  if (reminders.error) {
    console.error("Quest deadline scan failed:", reminders.error);
  }

  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", user.id)
    .order("read", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ notifications: data });
}