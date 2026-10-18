import { createClient } from "@/lib/supabase/server";
import { recordBehavioralEvent } from "@/lib/interventions/events";
import { NextResponse } from "next/server";

type RoomRow = {
  id: string;
  status: string | null;
  started_at: string | null;
  duration_minutes: number | null;
};

// POST /api/rooms/settle
// Records focus sessions for rooms the user was part of but never
// saved, for example because their tab was closed when the timer
// ended. Safe to call often: any room that already has a session row
// for this user is skipped.
export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: participations, error: participationError } = await supabase
    .from("room_participants")
    .select("room_id")
    .eq("user_id", user.id);

  if (participationError) {
    console.error("Settle participation lookup error:", participationError);
    return NextResponse.json({ error: "Could not load rooms" }, { status: 500 });
  }

  const roomIds = [...new Set((participations ?? []).map((row) => row.room_id))];

  if (roomIds.length === 0) {
    return NextResponse.json({ settled: 0 });
  }

  const { data: rooms, error: roomsError } = await supabase
    .from("rooms")
    .select("id, status, started_at, duration_minutes")
    .in("id", roomIds);

  if (roomsError) {
    console.error("Settle room lookup error:", roomsError);
    return NextResponse.json({ error: "Could not load rooms" }, { status: 500 });
  }

  const now = Date.now();

  const dueRooms = ((rooms ?? []) as RoomRow[]).filter((room) => {
    if (!room.started_at || !room.duration_minutes) return false;

    const startedAt = new Date(room.started_at).getTime();
    if (Number.isNaN(startedAt)) return false;

    const endedAt = startedAt + room.duration_minutes * 60_000;

    return room.status === "ended" || endedAt <= now;
  });

  if (dueRooms.length === 0) {
    return NextResponse.json({ settled: 0 });
  }

  const { data: existingSessions, error: sessionsError } = await supabase
    .from("focus_sessions")
    .select("room_id")
    .eq("user_id", user.id)
    .in("room_id", dueRooms.map((room) => room.id));

  if (sessionsError) {
    console.error("Settle session lookup error:", sessionsError);
    return NextResponse.json({ error: "Could not load sessions" }, { status: 500 });
  }

  const settledRooms = new Set(
    (existingSessions ?? []).map((row) => row.room_id)
  );

  let settled = 0;

  for (const room of dueRooms) {
    if (settledRooms.has(room.id)) continue;

    const startedAt = new Date(room.started_at as string);
    const durationMinutes = room.duration_minutes as number;
    const endedAt = new Date(startedAt.getTime() + durationMinutes * 60_000);

    const { data, error } = await supabase.rpc("complete_focus_session", {
      p_room_id: room.id,
      p_started_at: startedAt.toISOString(),
      p_ended_at: endedAt.toISOString(),
      p_duration_min: durationMinutes,
    });

    if (error || !data?.[0]) {
      console.error(
        `Could not settle focus session for room ${room.id}:`,
        error
      );
      continue;
    }

    await recordBehavioralEvent(user.id, "session_completed", {
      room_id: room.id,
      duration_min: durationMinutes,
      settled_after_end: true,
    });

    await supabase
      .from("room_participants")
      .update({ status: "completed" })
      .eq("room_id", room.id)
      .eq("user_id", user.id);

    settledRooms.add(room.id);
    settled += 1;
  }

  return NextResponse.json({ settled });
}
