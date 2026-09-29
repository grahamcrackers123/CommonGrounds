"use client";

import { createClient } from "@/lib/supabase/client";
import {
  ActionIcon,
  Avatar,
  Badge,
  Box,
  Button,
  CopyButton,
  Divider,
  Group,
  Menu,
  Modal,
  NumberInput,
  Paper,
  Progress,
  Select,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  ThemeIcon,
  Title,
  Tooltip,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  AlarmClock,
  Check,
  CloudRain,
  Coffee,
  Copy,
  Flame,
  Heart,
  MoreHorizontal,
  Music,
  Pause,
  Play,
  RefreshCw,
  Sparkles,
  Square,
  Timer,
  Trees,
  Trophy,
  UserMinus,
  UserPlus,
  Users,
  Volume2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type Phase = "lobby" | "live" | "summary";

interface Friend {
  id?: string;
  userId?: string;
  name: string;
  initials: string;
  color: string;
  online: boolean;
}

interface Participant {
  name: string;
  initials: string;
  color: string;
  isYou?: boolean;
}

interface HistoryRow {
  id?: string;
  room: string;
  minutes: number;
  date: string;
}

interface SessionResult {
  roomName: string;
  studyGoal: string;
  linkedTask: string | null;
  plannedMinutes: number;
  actualMinutes: number;
  participantNames: string[];
  completed: boolean;
}

interface RewardTier {
  duration_min: number;
  coins: number;
  pet_energy: number;
  streak_xp: number;
}

const MAX_PARTICIPANTS = 4;
const PRESET_MINUTES = [15, 30, 45, 60];

const SOUNDS = [
  { key: "none", label: "Silence", icon: Volume2 },
  { key: "rain", label: "Rain", icon: CloudRain },
  { key: "cafe", label: "Cafe", icon: Coffee },
  { key: "forest", label: "Forest", icon: Trees },
];

const FRIEND_COLORS = ["pink", "blue", "orange", "violet", "teal", "grape", "indigo", "cyan"];

const initialsOf = (name: string) =>
  name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

const colorFor = (name: string) => {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return FRIEND_COLORS[hash % FRIEND_COLORS.length];
};

const fmt = (totalSeconds: number) => {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
};

const loadHistory = (): HistoryRow[] => {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem("focusroom-history");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    return [];
  }
  return [];
};

const mapBackendFriend = (row: Record<string, unknown>): Friend => {
  const name =
    (typeof row.display_name === "string" && row.display_name) ||
    (typeof row.name === "string" && row.name) ||
    (typeof row.full_name === "string" && row.full_name) ||
    "Friend";
  const friendId =
    (typeof row.friend_id === "string" && row.friend_id) ||
    (typeof row.user_id === "string" && row.user_id) ||
    "";
  const lastSeen = typeof row.last_seen_at === "string" ? new Date(row.last_seen_at).getTime() : 0;
  const online = !row.last_seen_at || Date.now() - lastSeen < 3 * 60 * 1000;
  return {
    id: row.id != null ? String(row.id) : undefined,
    userId: friendId ? String(friendId) : undefined,
    name,
    initials: initialsOf(name),
    color: colorFor(name),
    online,
  };
};

const mapHistoryRow = (row: Record<string, unknown>): HistoryRow => ({
  id: row.id != null ? String(row.id) : undefined,
  room: typeof row.name === "string" && row.name ? row.name : "Focus Room",
  minutes: typeof row.duration_minutes === "number" ? row.duration_minutes : 0,
  date:
    (typeof row.ended_at === "string" && row.ended_at) ||
    (typeof row.started_at === "string" && row.started_at) ||
    "",
});

export default function FocusRoomPage() {
  const supabase = useMemo(() => createClient(), []);
  const [phase, setPhase] = useState<Phase>("lobby");

  const [roomName, setRoomName] = useState("");
  const [studyGoal, setStudyGoal] = useState("");
  const [durationPreset, setDurationPreset] = useState<number | "custom">(30);
  const [customMinutes, setCustomMinutes] = useState(45);
  const [linkedTask, setLinkedTask] = useState<string | null>(null);
  const [quests, setQuests] = useState<{ id: string; title: string }[]>([]);
  const [rewardTiers, setRewardTiers] = useState<RewardTier[]>([]);

  const [friends, setFriends] = useState<Friend[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [displayName, setDisplayName] = useState("You");
  const [roomId, setRoomId] = useState<string | null>(null);
  const [roomCode, setRoomCode] = useState<string | null>(null);

  const [history, setHistory] = useState<HistoryRow[]>(loadHistory);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [friendCode, setFriendCode] = useState("");
  const [friendReqSending, setFriendReqSending] = useState(false);

  const [remaining, setRemaining] = useState(30 * 60);
  const [running, setRunning] = useState(false);
  const [sound, setSound] = useState("rain");
  const [sessionResult, setSessionResult] = useState<SessionResult | null>(null);
  const [sessionStartedAt, setSessionStartedAt] = useState<string | null>(null);

  const youParticipant: Participant = {
    name: displayName,
    initials: initialsOf(displayName),
    color: "green",
    isYou: true,
  };
  const lobbyParticipants = [youParticipant, ...participants];
  const selectedMinutes = durationPreset === "custom" ? Math.max(1, customMinutes) : durationPreset;
  const total = selectedMinutes * 60;
  const progress = Math.round(((total - remaining) / total) * 100);
  const activeSound = SOUNDS.find((s) => s.key === sound) ?? SOUNDS[0];
  const inviteCode = roomCode ?? "";

  const todayRows = history.filter(
    (h) => new Date(h.date).toDateString() === new Date().toDateString()
  );
  const todaySessions = todayRows.length;
  const todayMinutes = todayRows.reduce((sum, row) => sum + row.minutes, 0);
  const runningTodayMinutes = phase === "live" ? todayMinutes + (total - remaining) / 60 : todayMinutes;
  const todayProgress = Math.min(100, (runningTodayMinutes / 120) * 100);
  const onlineFriends = friends.filter((f) => f.online);

  const tierFor = (minutes: number): RewardTier => {
    let best: RewardTier | null = null;
    for (const tier of rewardTiers) {
      if (tier.duration_min <= minutes && (!best || tier.duration_min > best.duration_min)) {
        best = tier;
      }
    }
    if (best) return best;
    return { duration_min: minutes, coins: 0, pet_energy: 0, streak_xp: 0 };
  };

  useEffect(() => {
    async function loadProfile() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", user.id)
        .single();
      if (data?.display_name) setDisplayName(data.display_name);
    }
    loadProfile();
  }, [supabase]);

  useEffect(() => {
    fetch("/api/quests?status=pending")
      .then((res) => res.json())
      .then((data) => {
        const list = (data.quests ?? []).map((q: { id: string; title: string }) => ({
          id: q.id,
          title: q.title,
        }));
        setQuests(list);
        if (list.length > 0) setLinkedTask((prev) => prev ?? list[0].title);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    supabase
      .from("focus_reward_tiers")
      .select("duration_min, coins, pet_energy, streak_xp")
      .order("duration_min", { ascending: true })
      .then(({ data, error }) => {
        if (!error && Array.isArray(data)) setRewardTiers(data);
      });
  }, [supabase]);

  const loadFriends = async () => {
    try {
      const res = await fetch("/api/friends");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.friends)) {
          setFriends(data.friends.map((row: Record<string, unknown>) => mapBackendFriend(row)));
        }
      }
    } catch {
      return;
    }
  };

  const refreshHistory = async () => {
    try {
      const res = await fetch("/api/rooms/history");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.history)) {
          setHistory(data.history.map((row: Record<string, unknown>) => mapHistoryRow(row)));
        }
      }
    } catch {
      return;
    }
  };

  const createRoom = async () => {
    setRoomId(null);
    setRoomCode(null);
    try {
      const res = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          duration_minutes: selectedMinutes,
          name: roomName.trim() || undefined,
          goal: studyGoal.trim() || undefined,
          linked_task: linkedTask || undefined,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.room?.id) {
          setRoomId(String(data.room.id));
          if (data.room.code) setRoomCode(String(data.room.code));
        }
      }
    } catch {
      return;
    }
  };

  useEffect(() => {
    const t = setTimeout(() => {
      loadFriends();
      refreshHistory();
      createRoom();
    }, 0);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (phase !== "live" || !roomId) return;
    const poll = setInterval(() => {
      fetch(`/api/rooms/${encodeURIComponent(roomId)}`)
        .then((res) => res.json())
        .then((data) => {
          const rows = data?.participants;
          if (!Array.isArray(rows)) return;
          const names = rows
            .map((r: Record<string, unknown>) =>
              typeof r.display_name === "string"
                ? r.display_name
                : typeof r.name === "string"
                  ? r.name
                  : null
            )
            .filter((n: string | null): n is string => Boolean(n));
          const joined = names.filter(
            (n) => n !== displayName && !participants.some((p) => p.name === n)
          );
          if (joined.length === 0) return;
          setParticipants((ps) => [
            ...ps,
            ...joined.map((n) => ({ name: n, initials: initialsOf(n), color: colorFor(n) })),
          ]);
        })
        .catch(() => undefined);
    }, 8000);
    return () => clearInterval(poll);
  }, [phase, roomId, displayName, participants]);

  const finishSession = (completed: boolean) => {
    setRunning(false);
    const elapsed = total - remaining;
    const actualMinutes = completed
      ? selectedMinutes
      : Math.max(1, Math.round(elapsed / 60));
    const result: SessionResult = {
      roomName: roomName.trim() || "Focus Room",
      studyGoal: studyGoal.trim() || "No goal set",
      linkedTask,
      plannedMinutes: selectedMinutes,
      actualMinutes,
      participantNames: [youParticipant.name, ...participants.map((p) => p.name)],
      completed,
    };
    setSessionResult(result);
    const endedAt = new Date().toISOString();
    fetch("/api/focus-sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        room_id: roomId,
        started_at: sessionStartedAt ?? endedAt,
        ended_at: endedAt,
        duration_min: actualMinutes,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data?.saved) return;
        notifications.show({
          title: "Session not saved",
          message:
            data?.error ??
            "The session could not be saved. Check that the complete_focus_session SQL has been run.",
          color: "red",
        });
      })
      .catch(() => {
        notifications.show({
          title: "Session not saved",
          message: "You appear to be offline.",
          color: "red",
        });
      });
    if (roomId) {
      fetch(`/api/rooms/${encodeURIComponent(roomId)}/complete`, { method: "POST" }).catch(
        () => undefined
      );
      fetch(`/api/rooms/${encodeURIComponent(roomId)}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "completed" }),
      }).catch(() => undefined);
    }
    setSessionStartedAt(null);
    const row: HistoryRow = {
      room: result.roomName,
      minutes: actualMinutes,
      date: endedAt,
    };
    setHistory((prev) => {
      const next = [row, ...prev];
      try {
        localStorage.setItem("focusroom-history", JSON.stringify(next));
      } catch {
        console.warn("Could not persist focus history.");
      }
      return next;
    });
    setPhase("summary");
  };

  useEffect(() => {
    if (!running || phase !== "live") return;
    const interval = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setRunning(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [running, phase]);

  useEffect(() => {
    if (phase === "live" && !running && remaining === 0) {
      const t = setTimeout(() => finishSession(true), 0);
      return () => clearTimeout(t);
    }
  }, [phase, running, remaining]);


  const startSession = () => {
    setRemaining(total);
    setRunning(true);
    setPhase("live");
    setSessionStartedAt(new Date().toISOString());
    if (roomId) {
      fetch(`/api/rooms/${encodeURIComponent(roomId)}/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: roomName.trim() || undefined,
          goal: studyGoal.trim() || undefined,
          linked_task: linkedTask || undefined,
          duration_minutes: selectedMinutes,
        }),
      }).catch(() => undefined);
      fetch(`/api/rooms/${encodeURIComponent(roomId)}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "focus" }),
      }).catch(() => undefined);
    }
  };

  const toggleRunning = () => {
    const next = !running;
    setRunning(next);
    if (roomId) {
      fetch(`/api/rooms/${encodeURIComponent(roomId)}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next ? "focus" : "break" }),
      }).catch(() => undefined);
    }
  };

  const resetTimer = () => {
    setRunning(false);
    setRemaining(total);
  };

  const endEarly = () => finishSession(false);

  const backToLobby = () => {
    setPhase("lobby");
    setRunning(false);
    setRemaining(total);
    setParticipants([]);
    refreshHistory();
    createRoom();
  };

  const inviteFriend = async (friend: Friend) => {
    if (participants.some((p) => p.name === friend.name)) {
      notifications.show({
        title: "Already in lobby",
        message: `${friend.name} is already a participant.`,
        color: "blue",
      });
      return;
    }
    if (participants.length >= MAX_PARTICIPANTS - 1) {
      notifications.show({
        title: "Lobby is full",
        message: `The lobby is limited to ${MAX_PARTICIPANTS} members.`,
        color: "red",
      });
      return;
    }
    if (!roomId) {
      notifications.show({
        title: "Room not ready",
        message: "The room hasn't been created yet. Try again in a moment.",
        color: "red",
      });
      return;
    }
    if (!friend.userId) {
      notifications.show({
        title: "Invite failed",
        message: `${friend.name} can't be invited right now.`,
        color: "red",
      });
      return;
    }
    try {
      const res = await fetch(`/api/rooms/${encodeURIComponent(roomId)}/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ friend_id: friend.userId }),
      });
      const data = await res.json();
      if (res.ok) {
        setParticipants((ps) => [
          ...ps,
          { name: friend.name, initials: friend.initials, color: friend.color },
        ]);
        notifications.show({
          title: "Invite sent",
          message: `${friend.name} was invited to the room.`,
          color: "green",
        });
      } else {
        notifications.show({
          title: "Invite failed",
          message: data.error ?? "Try again later.",
          color: "red",
        });
      }
    } catch {
      notifications.show({
        title: "Invite failed",
        message: "You appear to be offline.",
        color: "red",
      });
    }
  };

  const unfriend = async (friend: Friend) => {
    if (friend.id) {
      await fetch(`/api/friends/${encodeURIComponent(friend.id)}`, { method: "DELETE" }).catch(
        () => undefined
      );
    }
    setFriends((fs) => fs.filter((f) => f.name !== friend.name));
    setParticipants((ps) => ps.filter((p) => p.name !== friend.name));
    notifications.show({
      title: "Unfriended",
      message: `${friend.name} was removed from your friends list.`,
      color: "blue",
    });
  };

  const submitAddFriend = async () => {
    const code = friendCode.trim();
    if (!code) {
      notifications.show({
        title: "Missing code",
        message: "Enter the friend code to send a request.",
        color: "red",
      });
      return;
    }
    setFriendReqSending(true);
    try {
      const searchRes = await fetch(`/api/friends/search?code=${encodeURIComponent(code)}`);
      const searchData = await searchRes.json();
      if (!searchRes.ok) {
        notifications.show({
          title: "Not found",
          message: searchData.error ?? "No user with that code.",
          color: "red",
        });
        return;
      }
      const friendName =
        typeof searchData.user?.display_name === "string" ? searchData.user.display_name : code;
      const res = await fetch("/api/friends/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (res.ok) {
        notifications.show({
          title: "Request sent",
          message: `Friend request sent to ${friendName}.`,
          color: "green",
        });
      } else {
        notifications.show({
          title: "Could not send request",
          message: data.error ?? "Try again later.",
          color: "red",
        });
      }
    } catch {
      notifications.show({
        title: "Could not send request",
        message: "You appear to be offline.",
        color: "red",
      });
    } finally {
      setFriendReqSending(false);
      setFriendCode("");
      setInviteModalOpen(false);
    }
  };

  if (phase === "live") {
    return (
      <Box style={{ backgroundColor: "#F7F9FC", minHeight: "100vh" }}>
        <Box maw={1150} mx="auto" p={{ base: 20, md: 40 }}>
          <Group justify="space-between" align="flex-end" mb={24} wrap="wrap">
            <Box>
              <Title order={1} fw={800}>
                Focus Room
              </Title>
              <Text c="dimmed" size="sm" mt={4}>
                {roomName.trim() || "Focus Room"}
              </Text>
            </Box>
            <Group gap={8}>
              <Badge variant="light" color="green" size="lg" radius="xl" leftSection={<Flame size={14} />}>
                {todaySessions} sessions today
              </Badge>
              <Badge variant="light" color="blue" size="lg" radius="xl" leftSection={<AlarmClock size={14} />}>
                {Math.floor(runningTodayMinutes)} min
              </Badge>
            </Group>
          </Group>

          <SimpleGrid cols={{ base: 1, lg: 3 }} spacing="md" mb={28}>
            <Paper p="lg" radius="lg" shadow="sm" withBorder style={{ gridColumn: "span 2" }}>
              <Group justify="space-between" mb="md">
                <Title order={3} fz="lg" fw={700}>
                  {running ? "Focusing…" : "Ready when you are"}
                </Title>
                <Badge
                  variant={running ? "filled" : "light"}
                  color={running ? "green" : "gray"}
                  size="lg"
                  radius="xl"
                  leftSection={running ? <Play size={12} /> : <Pause size={12} />}
                >
                  {running ? "In progress" : "Paused"}
                </Badge>
              </Group>

              <Box style={{ display: "grid", placeItems: "center", padding: "24px 0 8px" }}>
                <Box style={{ position: "relative", width: 260, height: 260 }}>
                  <svg width={260} height={260} viewBox="0 0 260 260" style={{ transform: "rotate(-90deg)" }}>
                    <circle cx={130} cy={130} r={118} fill="none" stroke="#F1F3F5" strokeWidth={14} />
                    <circle
                      cx={130}
                      cy={130}
                      r={118}
                      fill="none"
                      stroke={running ? "#1C7ED6" : "#ADB5BD"}
                      strokeWidth={14}
                      strokeLinecap="round"
                      strokeDasharray={2 * Math.PI * 118}
                      strokeDashoffset={2 * Math.PI * 118 * (1 - progress / 100)}
                      style={{ transition: "stroke-dashoffset 0.5s linear, stroke 0.3s ease" }}
                    />
                  </svg>
                  <Box
                    style={{
                      position: "absolute",
                      inset: 0,
                      display: "grid",
                      placeItems: "center",
                    }}
                  >
                    <Stack align="center" gap={0}>
                      <Text fz={56} fw={800} lh={1} style={{ fontVariantNumeric: "tabular-nums" }}>
                        {fmt(remaining)}
                      </Text>
                      <Text c="dimmed" fz="sm" fw={600} mt={4}>
                        {selectedMinutes}-minute session
                      </Text>
                    </Stack>
                  </Box>
                </Box>
              </Box>

              {studyGoal.trim() && (
                <Text c="dimmed" fz="xs" ta="center" mt={4}>
                  Goal: {studyGoal.trim()}
                </Text>
              )}

              <Group justify="center" gap="sm" mt="lg">
                <Tooltip label="Reset" withArrow>
                  <Button
                    variant="light"
                    radius="xl"
                    px={14}
                    onClick={resetTimer}
                    disabled={!running && remaining === total}
                  >
                    <RefreshCw size={17} />
                  </Button>
                </Tooltip>
                <Button
                  size="lg"
                  radius="xl"
                  px={48}
                  color={running ? "yellow" : "blue"}
                  onClick={toggleRunning}
                  leftSection={running ? <Pause size={18} /> : <Play size={18} />}
                >
                  {running ? "Pause" : "Start"}
                </Button>
              </Group>

              <Button
                fullWidth
                variant="subtle"
                color="red"
                mt="lg"
                leftSection={<Square size={14} />}
                onClick={endEarly}
              >
                End session early
              </Button>
            </Paper>

            <Stack gap="md">
              <Paper p="lg" radius="lg" shadow="sm" withBorder>
                <Group gap={8} mb="md">
                  <ThemeIcon radius="lg" variant="light" color="indigo" size={32}>
                    <Music size={18} />
                  </ThemeIcon>
                  <Title order={3} fz="lg" fw={700}>
                    Ambience
                  </Title>
                </Group>
                <SimpleGrid cols={2} spacing="xs">
                  {SOUNDS.map((s) => {
                    const active = sound === s.key;
                    return (
                      <Box
                        key={s.key}
                        p="sm"
                        style={{
                          borderRadius: 12,
                          border: `1px solid ${active ? "#74C0FC" : "#E9ECEF"}`,
                          backgroundColor: active ? "#E7F5FF" : "#FFFFFF",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 8,
                        }}
                        onClick={() => setSound(s.key)}
                      >
                        <s.icon size={16} color={active ? "#1C7ED6" : "#868E96"} />
                        <Text fz="sm" fw={600} c={active ? "#1C7ED6" : "#495057"}>
                          {s.label}
                        </Text>
                      </Box>
                    );
                  })}
                </SimpleGrid>
                <Text c="dimmed" fz="xs" mt={10} ta="center">
                  Now playing: {activeSound.label === "Silence" ? "silence" : `${activeSound.label} sounds`}
                </Text>
              </Paper>

              <Paper p="lg" radius="lg" shadow="sm" withBorder>
                <Group justify="space-between" mb="md">
                  <Group gap={8}>
                    <ThemeIcon radius="lg" variant="light" color="green" size={32}>
                      <Users size={18} />
                    </ThemeIcon>
                    <Title order={3} fz="lg" fw={700}>
                      Room Members
                    </Title>
                  </Group>
                  <Badge variant="light" color="blue" radius="xl">
                    {lobbyParticipants.length}/{MAX_PARTICIPANTS}
                  </Badge>
                </Group>
                <Stack gap="xs">
                  {lobbyParticipants.map((p) => (
                    <Group
                      key={p.name}
                      justify="space-between"
                      p="xs"
                      style={{ borderRadius: 10, backgroundColor: "#F8F9FA" }}
                      wrap="nowrap"
                    >
                      <Group gap={10} wrap="nowrap">
                        <Avatar color={p.color} radius="xl" size={32}>
                          {p.initials}
                        </Avatar>
                        <Box>
                          <Text fz="sm" fw={600}>
                            {p.name}
                          </Text>
                          <Group gap={5}>
                            <Box
                              w={7}
                              h={7}
                              style={{ borderRadius: 99, backgroundColor: running ? "#2F9E44" : "#ADB5BD" }}
                            />
                            <Text fz="xs" c="dimmed">
                              {running ? "Focusing" : "On break"}
                            </Text>
                          </Group>
                        </Box>
                      </Group>
                      {running && (
                        <Badge variant="light" color="green" size="xs" radius="xl">
                          <Flame size={10} />
                        </Badge>
                      )}
                    </Group>
                  ))}
                </Stack>
              </Paper>
            </Stack>
          </SimpleGrid>

          <Paper p="lg" radius="lg" shadow="sm" withBorder>
            <Group justify="space-between" mb="sm">
              <Group gap={8}>
                <ThemeIcon radius="lg" variant="light" color="yellow" size={32}>
                  <Trophy size={18} />
                </ThemeIcon>
                <Title order={3} fz="lg" fw={700}>
                  Today&apos;s Focus Goal
                </Title>
              </Group>
              <Text fz="sm" fw={700} c="green">
                {Math.round(todayProgress)}%
              </Text>
            </Group>
            <Progress
              value={todayProgress}
              color="green"
              radius="xl"
              size="lg"
              striped
              animated
            />
            <Text c="dimmed" fz="xs" mt={8}>
              {Math.floor(runningTodayMinutes)} of 120 minutes • {todaySessions} sessions completed
            </Text>
          </Paper>
        </Box>
      </Box>
    );
  }

  if (phase === "summary" && sessionResult) {
    const result = sessionResult;
    const tier = tierFor(result.actualMinutes);
    const coins = tier.coins;
    const xp = tier.streak_xp;
    const petEnergy = tier.pet_energy;
    const groupBonus = result.participantNames.length > 1;

    return (
      <Box style={{ backgroundColor: "#F7F9FC", minHeight: "100vh" }}>
        <Box maw={760} mx="auto" p={{ base: 20, md: 40 }}>
          <Paper p="xl" radius="lg" shadow="sm" withBorder>
            <Stack align="center" gap={8} mb="lg">
              <ThemeIcon size={64} radius="xl" variant="filled" color={result.completed ? "green" : "yellow"}>
                {result.completed ? <Check size={30} /> : <Timer size={30} />}
              </ThemeIcon>
              <Title order={2} fw={800}>
                {result.completed ? "Session Complete!" : "Session Ended"}
              </Title>
              <Text c="dimmed" size="sm" ta="center">
                {result.completed
                  ? "Great work. Your focus session is finished."
                  : "You ended the session early. Nice work anyway!"}
              </Text>
            </Stack>

            <Divider mb="lg" />

            <Stack gap="sm">
              <Group justify="space-between" wrap="nowrap">
                <Text fz="sm" c="dimmed">
                  Room
                </Text>
                <Text fz="sm" fw={700} ta="right">
                  {result.roomName}
                </Text>
              </Group>
              <Group justify="space-between" wrap="nowrap">
                <Text fz="sm" c="dimmed">
                  Study Goal
                </Text>
                <Text fz="sm" fw={700} ta="right">
                  {result.studyGoal}
                </Text>
              </Group>
              <Group justify="space-between" wrap="nowrap">
                <Text fz="sm" c="dimmed">
                  Linked Task
                </Text>
                <Text fz="sm" fw={700} ta="right">
                  {result.linkedTask ?? "—"}
                </Text>
              </Group>
              <Group justify="space-between" wrap="nowrap">
                <Text fz="sm" c="dimmed">
                  Planned Duration
                </Text>
                <Text fz="sm" fw={700} ta="right">
                  {result.plannedMinutes} minutes
                </Text>
              </Group>
              <Group justify="space-between" wrap="nowrap">
                <Text fz="sm" c="dimmed">
                  Time Focused
                </Text>
                <Text fz="sm" fw={700} ta="right">
                  {result.actualMinutes} minutes
                </Text>
              </Group>
              <Group justify="space-between" wrap="nowrap">
                <Text fz="sm" c="dimmed">
                  Participants
                </Text>
                <Group gap={6} justify="flex-end">
                  {result.participantNames.map((name) => (
                    <Tooltip key={name} label={name} withArrow>
                      <Avatar color="blue" radius="xl" size={24}>
                        {initialsOf(name)}
                      </Avatar>
                    </Tooltip>
                  ))}
                </Group>
              </Group>
            </Stack>

            <Divider my="lg" />

            <Stack align="center" gap={6}>
              <Text fz="sm" fw={700} tt="uppercase" c="dimmed">
                Rewards Earned
              </Text>
              <Group gap={8} justify="center">
                <Badge size="lg" variant="light" color="yellow" radius="xl" leftSection={<Flame size={13} />}>
                  +{coins} Coins
                </Badge>
                <Badge size="lg" variant="light" color="green" radius="xl" leftSection={<Sparkles size={13} />}>
                  +{xp} XP
                </Badge>
                <Badge size="lg" variant="light" color="pink" radius="xl" leftSection={<Heart size={13} />}>
                  +{petEnergy} Pet Energy
                </Badge>
              </Group>
              {groupBonus && (
                <Text fz="xs" c="dimmed">
                  Group bonus applied, focusing together earned extra rewards
                </Text>
              )}
            </Stack>

            <Group justify="center" mt="xl">
              <Button size="md" radius="xl" leftSection={<RefreshCw size={16} />} onClick={backToLobby}>
                Start Another Session
              </Button>
              <Button size="md" radius="xl" variant="default" onClick={backToLobby}>
                Back to Lobby
              </Button>
            </Group>
          </Paper>
        </Box>
      </Box>
    );
  }

  return (
    <Box style={{ backgroundColor: "#F7F9FC", minHeight: "100vh" }}>
      <Box maw={1150} mx="auto" p={{ base: 20, md: 40 }}>
        <Group justify="space-between" align="flex-end" mb={24} wrap="wrap">
          <Box>
            <Title order={1} fw={800}>
              Focus Room
            </Title>
            <Text c="dimmed" size="sm" mt={4}>
              Set a sprint, invite your crew, and lock in.
            </Text>
          </Box>
          <Group gap={8}>
            <Badge variant="light" color="green" size="lg" radius="xl" leftSection={<Flame size={14} />}>
              {todaySessions} sessions today
            </Badge>
            <Badge variant="light" color="blue" size="lg" radius="xl" leftSection={<AlarmClock size={14} />}>
              {todayMinutes} min focused
            </Badge>
          </Group>
        </Group>

        <SimpleGrid cols={{ base: 1, lg: 3 }} spacing="md" mb={28}>
          <Stack gap="md" style={{ gridColumn: "span 2" }}>
            <Paper p="lg" radius="lg" shadow="sm" withBorder>
              <Group gap={8} mb="lg">
                <ThemeIcon radius="lg" variant="light" color="blue" size={32}>
                  <Timer size={18} />
                </ThemeIcon>
                <Title order={3} fz="lg" fw={700}>
                  Room Setup
                </Title>
              </Group>

              <Stack gap="md">
                <TextInput
                  label="Room Name"
                  value={roomName}
                  onChange={(e) => setRoomName(e.currentTarget.value)}
                />
                <TextInput
                  label="Study Goal"
                  value={studyGoal}
                  onChange={(e) => setStudyGoal(e.currentTarget.value)}
                />

                <Box>
                  <Text fz="sm" fw={600} mb={6}>
                    Duration
                  </Text>
                  <Group gap={8}>
                    {PRESET_MINUTES.map((m) => (
                      <Button
                        key={m}
                        size="xs"
                        radius="xl"
                        variant={durationPreset === m ? "filled" : "default"}
                        onClick={() => setDurationPreset(m)}
                      >
                        {m}m
                      </Button>
                    ))}
                    <Button
                      size="xs"
                      radius="xl"
                      variant={durationPreset === "custom" ? "filled" : "default"}
                      onClick={() => setDurationPreset("custom")}
                    >
                      Custom
                    </Button>
                  </Group>
                  {durationPreset === "custom" && (
                    <NumberInput
                      mt="xs"
                      label="Minutes"
                      value={customMinutes}
                      onChange={(v) => setCustomMinutes(Number(v) || 1)}
                      min={5}
                      max={240}
                      style={{ maxWidth: 160 }}
                    />
                  )}
                </Box>

                <Select
                  label="Linked Task"
                  data={quests.map((q) => ({ value: q.title, label: q.title }))}
                  value={linkedTask}
                  onChange={(v) => setLinkedTask(v)}
                  searchable
                  clearable
                  nothingFoundMessage="No pending quests"
                />

                <Button
                  size="md"
                  fullWidth
                  mt="sm"
                  leftSection={<Play size={16} />}
                  onClick={startSession}
                >
                  Start Focus Room
                </Button>
              </Stack>
            </Paper>
          </Stack>

          <Stack gap="md">
            <Paper p="lg" radius="lg" shadow="sm" withBorder>
              <Group justify="space-between" mb={4}>
                <Group gap={8}>
                  <ThemeIcon radius="lg" variant="light" color="green" size={32}>
                    <Users size={18} />
                  </ThemeIcon>
                  <Title order={3} fz="lg" fw={700}>
                    Participants in the Lobby
                  </Title>
                </Group>
                <Badge variant="light" color="blue" radius="xl">
                  {lobbyParticipants.length}/{MAX_PARTICIPANTS}
                </Badge>
              </Group>
              <Text c="dimmed" fz="xs" mb="md">
                Invite up to {MAX_PARTICIPANTS - 1} friends to join the room
              </Text>

              <Stack gap="xs">
                {lobbyParticipants.map((p) => (
                  <Group
                    key={p.name}
                    justify="space-between"
                    p="xs"
                    style={{ borderRadius: 10, backgroundColor: p.isYou ? "#E7F5FF" : "#F8F9FA" }}
                    wrap="nowrap"
                  >
                    <Group gap={10} wrap="nowrap">
                      <Avatar color={p.color} radius="xl" size={32}>
                        {p.initials}
                      </Avatar>
                      <Box>
                        <Text fz="sm" fw={600}>
                          {p.name}
                        </Text>
                        <Text fz="xs" c="dimmed">
                          {p.isYou ? "Room host" : "In lobby"}
                        </Text>
                      </Box>
                    </Group>
                    <Badge variant="light" color={p.isYou ? "blue" : "green"} size="xs" radius="xl">
                      {p.isYou ? "You" : "Ready"}
                    </Badge>
                  </Group>
                ))}
                {lobbyParticipants.length < MAX_PARTICIPANTS && (
                  <Text c="dimmed" fz="xs" ta="center">
                    Invite friends to fill the room
                  </Text>
                )}
              </Stack>
            </Paper>

            <Paper p="lg" radius="lg" shadow="sm" withBorder>
              <Group gap={8} mb="md">
                <ThemeIcon radius="lg" variant="light" color="indigo" size={32}>
                  <Users size={18} />
                </ThemeIcon>
                <Title order={3} fz="lg" fw={700}>
                  Friends Online
                </Title>
              </Group>

              <Stack gap="xs" mb="md">
                {onlineFriends.map((f) => (
                  <Group
                    key={f.name}
                    justify="space-between"
                    p="xs"
                    style={{ borderRadius: 10, backgroundColor: "#F8F9FA" }}
                    wrap="nowrap"
                  >
                    <Group gap={10} wrap="nowrap">
                      <Avatar color={f.color} radius="xl" size={32}>
                        {f.initials}
                      </Avatar>
                      <Box>
                        <Text fz="sm" fw={600}>
                          {f.name}
                        </Text>
                        <Group gap={5}>
                          <Box w={7} h={7} style={{ borderRadius: 99, backgroundColor: "#2F9E44" }} />
                          <Text fz="xs" c="dimmed">
                            Online
                          </Text>
                        </Group>
                      </Box>
                    </Group>
                    <Menu position="bottom-end" withinPortal>
                      <Menu.Target>
                        <ActionIcon variant="subtle" color="gray" aria-label={`Actions for ${f.name}`}>
                          <MoreHorizontal size={16} />
                        </ActionIcon>
                      </Menu.Target>
                      <Menu.Dropdown>
                        <Menu.Item leftSection={<UserPlus size={14} />} onClick={() => inviteFriend(f)}>
                          Invite to Lobby
                        </Menu.Item>
                        <Menu.Item leftSection={<UserMinus size={14} />} color="red" onClick={() => unfriend(f)}>
                          Unfriend
                        </Menu.Item>
                      </Menu.Dropdown>
                    </Menu>
                  </Group>
                ))}
                {onlineFriends.length === 0 && (
                  <Text c="dimmed" fz="sm">
                    No friends online right now.
                  </Text>
                )}
              </Stack>

              <Stack gap="xs">
                <CopyButton value={inviteCode}>
                  {({ copied, copy }) => (
                    <Button
                      fullWidth
                      variant="filled"
                      color="dark"
                      disabled={!roomCode}
                      leftSection={copied ? <Check size={14} /> : <Copy size={14} />}
                      onClick={copy}
                    >
                      {copied
                        ? "Copied!"
                        : roomCode
                          ? `Copy Invite Code · ${inviteCode}`
                          : "Copy Invite Code"}
                    </Button>
                  )}
                </CopyButton>
                <Button
                  fullWidth
                  variant="default"
                  leftSection={<UserPlus size={14} />}
                  onClick={() => setInviteModalOpen(true)}
                >
                  Add Friend
                </Button>
              </Stack>
            </Paper>
          </Stack>
        </SimpleGrid>

        <Paper p="lg" radius="lg" shadow="sm" withBorder>
          <Group gap={8} mb="md">
            <ThemeIcon radius="lg" variant="light" color="yellow" size={32}>
              <Trophy size={18} />
            </ThemeIcon>
            <Title order={3} fz="lg" fw={700}>
              Focus Room History
            </Title>
          </Group>
          <SimpleGrid cols={3} mb={8}>
            <Text fz="xs" fw={700} tt="uppercase" c="dimmed">
              Room
            </Text>
            <Text fz="xs" fw={700} tt="uppercase" c="dimmed">
              Sprint Time
            </Text>
            <Text fz="xs" fw={700} tt="uppercase" c="dimmed">
              Date
            </Text>
          </SimpleGrid>
          <Divider mb="sm" />
          <Stack gap="xs">
            {history.map((row, i) => (
              <Group
                key={row.id ?? `${row.room}-${i}`}
                justify="space-between"
                p="xs"
                style={{ borderRadius: 10, backgroundColor: "#F8F9FA" }}
                wrap="nowrap"
              >
                <Text fz="sm" fw={600} truncate style={{ flex: 1 }}>
                  {row.room}
                </Text>
                <Badge variant="light" color="blue" radius="xl">
                  {row.minutes}m
                </Badge>
                <Text fz="xs" c="dimmed" w={90} ta="right">
                  {row.date
                    ? new Date(row.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })
                    : "—"}
                </Text>
              </Group>
            ))}
            {history.length === 0 && (
              <Text c="dimmed" fz="sm">
                No sessions yet. Start your first focus room!
              </Text>
            )}
          </Stack>
        </Paper>
      </Box>

      <Modal
        opened={inviteModalOpen}
        onClose={() => setInviteModalOpen(false)}
        title="Add Friend"
        centered
      >
        <Text fz="sm" c="dimmed" mb="md">
          Ask your classmate for their user code and send a friend request.
        </Text>
        <TextInput
          value={friendCode}
          onChange={(e) => setFriendCode(e.currentTarget.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submitAddFriend();
          }}
          mb="md"
        />
        <Button
          fullWidth
          leftSection={<UserPlus size={14} />}
          onClick={submitAddFriend}
          loading={friendReqSending}
        >
          Send Request
        </Button>
      </Modal>
    </Box>
  );
}