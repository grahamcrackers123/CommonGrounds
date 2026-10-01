import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const remove = (client: typeof supabase) =>
    client
      .from("room_participants")
      .delete()
      .eq("room_id", id)
      .eq("user_id", user.id)
      .select("room_id");

  let { data, error } = await remove(supabase);

  // If RLS silently filtered the delete, retry with the service role,
  // still scoped to the authenticated user's own participant row.
  if (!error && !data?.length && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const admin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );
    ({ data, error } = await remove(admin));
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data?.length) return NextResponse.json({ error: "Not a participant" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
