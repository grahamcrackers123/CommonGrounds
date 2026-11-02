import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

// GET /api/rooms/active, the focus room the signed-in user is currently in.
// Used to resume a session after a full page reload or in a new tab.
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: participations, error: participationError } = await supabase
    .from("room_participants")
    .select("room_id")
    .eq("user_id", user.id);

  if (participationError) {
    console.error("Active room participation lookup error:", participationError);
    return NextResponse.json({ error: "Could not load rooms" }, { status: 500 });
  }

  const roomIds = [...new Set((participations ?? []).map((row) => row.room_id))];

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const roomsClient = serviceKey
    ? createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        serviceKey,
        { auth: { autoRefreshToken: false, persistSession: false } }
      )
    : supabase;

  const { data: ownedRooms, error: ownedError } = await roomsClient
    .from("rooms")
    .select("id, status, started_at, duration_minutes, code")
    .eq("owner_id", user.id)
    .not("started_at", "is", null)
    .in("status", ["active", "focus"]);

  if (ownedError) {
    console.error("Active owned room lookup error:", ownedError);
    return NextResponse.json({ error: "Could not load rooms" }, { status: 500 });
  }

  let joinedRooms: Record<string, unknown>[] = [];
  if (roomIds.length > 0) {
    const { data, error } = await roomsClient
      .from("rooms")
      .select("id, status, started_at, duration_minutes, code")
      .in("id", roomIds)
      .not("started_at", "is", null)
      .in("status", ["active", "focus"]);

    if (error) {
      console.error("Active joined room lookup error:", error);
      return NextResponse.json({ error: "Could not load rooms" }, { status: 500 });
    }
    joinedRooms = data ?? [];
  }

  const rooms = [
    ...new Map(
      [...(ownedRooms ?? []), ...joinedRooms].map((room) => [room.id, room])
    ).values(),
  ].sort(
    (a, b) =>
      new Date(b.started_at as string).getTime() - new Date(a.started_at as string).getTime()
  );

  const now = Date.now();
  const active = rooms.find((room) => {
    const startedAt = room.started_at ? new Date(room.started_at).getTime() : Number.NaN;
    const duration = Number(room.duration_minutes);
    return (
      Number.isFinite(startedAt) &&
      Number.isFinite(duration) &&
      duration > 0 &&
      startedAt + duration * 60_000 > now
    );
  });

  if (!active) return NextResponse.json({ room: null });

  const { data: state, error: stateError } = await supabase.rpc("get_room_state", {
    _room_id: active.id,
  });
  if (stateError) {
    console.error("Active room state lookup error:", stateError);
    return NextResponse.json({ error: stateError.message }, { status: 500 });
  }
  if (!state) return NextResponse.json({ room: null });

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .maybeSingle();

  return NextResponse.json({
    ...(state as Record<string, unknown>),
    code: active.code ?? null,
    currentUserId: user.id,
    currentUserName: profile?.display_name ?? null,
  });
}
