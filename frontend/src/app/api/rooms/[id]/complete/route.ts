import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

// POST /api/rooms/[id]/complete
// The owner can end the room at any time. Room members may close it
// once the scheduled end time has passed, so an absent host (closed
// tab, offline) cannot leave everyone stuck in an active room.
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // Without a service key, RLS restricts room updates to the owner.
  if (!serviceKey) {
    return endRoomAsOwner(supabase, id, user.id);
  }

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const { data: room, error: roomError } = await admin
    .from("rooms")
    .select("id, owner_id, status, started_at, duration_minutes")
    .eq("id", id)
    .maybeSingle();

  if (roomError) {
    console.error("Room lookup error:", roomError);
    return NextResponse.json({ error: roomError.message }, { status: 500 });
  }

  if (!room) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }

  if (room.status === "ended") {
    return NextResponse.json({ room });
  }

  if (room.owner_id !== user.id) {
    const { data: membership } = await admin
      .from("room_participants")
      .select("user_id")
      .eq("room_id", id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!membership) {
      return NextResponse.json(
        { error: "Only room members can end the room" },
        { status: 403 }
      );
    }

    const startedAt = room.started_at ? new Date(room.started_at).getTime() : Number.NaN;
    const durationMinutes = typeof room.duration_minutes === "number" ? room.duration_minutes : null;
    const dueAt = Number.isNaN(startedAt) || !durationMinutes
      ? null
      : startedAt + durationMinutes * 60_000;

    if (dueAt === null || Date.now() < dueAt) {
      return NextResponse.json(
        { error: "Only the host can end the session early." },
        { status: 403 }
      );
    }
  }

  const { data, error } = await admin
    .from("rooms")
    .update({ status: "ended" })
    .eq("id", id)
    .neq("status", "ended")
    .select("id, status, started_at, duration_minutes");

  if (error) {
    console.error("Room completion error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ room: data?.[0] ?? room });
}

async function endRoomAsOwner(
  supabase: Awaited<ReturnType<typeof createClient>>,
  id: string,
  userId: string
) {
  const { data, error } = await supabase
    .from("rooms")
    .update({ status: "ended" })
    .eq("id", id)
    .eq("owner_id", userId)
    .neq("status", "ended")
    .select("id, status, started_at, duration_minutes");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data?.length) {
    const { data: existing } = await supabase
      .from("rooms")
      .select("id, status, started_at, duration_minutes")
      .eq("id", id)
      .maybeSingle();

    if (existing?.status === "ended") {
      return NextResponse.json({ room: existing });
    }

    return NextResponse.json(
      { error: "Only the host can end the session early." },
      { status: 403 }
    );
  }

  return NextResponse.json({ room: data[0] });
}
