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
  Slider,
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
  AudioLinesOff,
  Check,
  CloudRain,
  Coffee,
  Copy,
  Crown,
  Flame,
  Heart,
  Lock,
  LogIn,
  LogOut,
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
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

type Phase = "lobby" | "live" | "summary";

interface Friend {
  id?: string;
  userId?: string;
  name: string;
  initials: string;
  color: string;
  online: boolean;
  status?: "accepted" | "pending";
  direction?: "incoming" | "outgoing";
}

interface Participant {
  name: string;
  initials: string;
  color: string;
  isYou?: boolean;
  userId?: string;
  status?: "ready" | "focus" | "break" | "completed";
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

// ambience options, each maps to a looping track in /public/sounds
const SOUNDS = [
  { key: "none", label: "Silence", icon: AudioLinesOff, audio: null },
  { key: "rain", label: "Rain", icon: CloudRain, audio: "/sounds/rain-sound.wav" },
  { key: "cafe", label: "Cafe", icon: Coffee, audio: "/sounds/cafe-sound.mp3" },
  { key: "forest", label: "Forest", icon: Trees, audio: "/sounds/forest-sound.wav" },
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

// member status dot colors + labels
const STATUS_META: Record<string, { label: string; color: string }> = {
  ready: { label: "Ready", color: "#ADB5BD" },
  focus: { label: "Focusing", color: "#2F9E44" },
  break: { label: "On break", color: "#F08C00" },
  completed: { label: "Finished", color: "#868E96" },
};

const statusOf = (status?: string) => STATUS_META[status ?? "ready"] ?? STATUS_META.ready;

const fmt = (totalSeconds: number) => {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
};

// read the focus history saved in localStorage
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

// normalize a friends API row into a Friend
const mapBackendFriend = (row: Record<string, unknown>): Friend => {
  const name =
    (typeof row.display_name === "string" && row.display_name) ||
    (typeof row.name === "string" && row.name) ||
    (typeof row.full_name === "string" && row.full_name) ||
    "Friend";
  const friendId =
    (typeof row.friend_user_id === "string" && row.friend_user_id) ||
    (typeof row.friend_id === "string" && row.friend_id) ||
    (typeof row.user_id === "string" && row.user_id) ||
    "";
  const status = row.status === "pending" ? "pending" : "accepted";
  const direction =
    row.direction === "outgoing" ? "outgoing" : row.direction === "incoming" ? "incoming" : undefined;
  const lastSeen =
    (typeof row.last_seen_at === "string" && new Date(row.last_seen_at).getTime()) ||
    (typeof row.presence === "string" && new Date(row.presence).getTime()) ||
    0;
  const online = status === "accepted" && (!lastSeen || Date.now() - lastSeen < 3 * 60 * 1000);
  return {
    id:
      row.friendship_id != null
        ? String(row.friendship_id)
        : row.id != null
          ? String(row.id)
          : undefined,
    userId: friendId ? String(friendId) : undefined,
    name,
    initials: initialsOf(name),
    color: colorFor(name),
    online,
    status,
    direction,
  };
};

// normalize a session row into the history shape
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
  // refs that survive re-renders: in-flight room, finish guard, countdown, audio
  const roomPromiseRef = useRef<Promise<string | null> | null>(null);
  const finishingRef = useRef(false);
  const finishSessionRef = useRef<(completed: boolean) => void>(() => { });
  const remainingRef = useRef(30 * 60);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  // which view is showing: lobby -> live -> summary
  const [phase, setPhase] = useState<Phase>("lobby");

  // room setup fields
  const [roomName, setRoomName] = useState("");
  const [studyGoal, setStudyGoal] = useState("");
  const [durationPreset, setDurationPreset] = useState<number | "custom">(30);
  const [customMinutes, setCustomMinutes] = useState(45);
  const [linkedTask, setLinkedTask] = useState<string | null>(null);
  const [quests, setQuests] = useState<{ id: string; title: string }[]>([]);
  const [rewardTiers, setRewardTiers] = useState<RewardTier[]>([]);

  // people: friends list, room participants, and the signed-in user
  const [friends, setFriends] = useState<Friend[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [displayName, setDisplayName] = useState("You");
  const [userId, setUserId] = useState<string | null>(null);
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [ownStatus, setOwnStatus] = useState<Participant["status"]>();
  const [roomId, setRoomId] = useState<string | null>(null);
  const [roomCode, setRoomCode] = useState<string | null>(null);

  // local history + invite/join state
  const [history, setHistory] = useState<HistoryRow[]>(loadHistory);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [friendCode, setFriendCode] = useState("");
  const [friendReqSending, setFriendReqSending] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [joining, setJoining] = useState(false);
  const [joinedRoom, setJoinedRoom] = useState(false);

  // focus session state: countdown, play/pause, ambience
  const [remaining, setRemaining] = useState(30 * 60);
  const [running, setRunning] = useState(false);
  const [sound, setSound] = useState("rain");
  const [volume, setVolume] = useState(60);
  const [sessionResult, setSessionResult] = useState<SessionResult | null>(null);
  const [sessionStartedAt, setSessionStartedAt] = useState<string | null>(null);

  // who leads the room + derived timer math
  const isLeader = !joinedRoom;
  const youParticipant: Participant = {
    name: displayName,
    initials: initialsOf(displayName),
    color: "green",
    isYou: true,
    userId: userId ?? undefined,
    status: ownStatus ?? (phase === "live" ? (running ? "focus" : "break") : "ready"),
  };
  const lobbyParticipants = [youParticipant, ...participants];
  const leaderId = ownerId ?? (isLeader ? userId : null);
  const isParticipantLeader = (p: Participant) =>
    leaderId != null && p.userId != null
      ? p.userId === leaderId
      : isLeader && Boolean(p.isYou);
  const selectedMinutes = durationPreset === "custom" ? Math.max(1, customMinutes) : durationPreset;
  const total = selectedMinutes * 60;
  const progress = Math.round(((total - remaining) / total) * 100);
  // ambience track currently selected
  const activeSound = SOUNDS.find((s) => s.key === sound) ?? SOUNDS[0];
  const soundFile = activeSound.audio;
  const inviteCode = roomCode ?? "";

  // today's sessions for the header badges
  const todayRows = history.filter(
    (h) => new Date(h.date).toDateString() === new Date().toDateString()
  );
  const todaySessions = todayRows.length;
  const todayMinutes = todayRows.reduce((sum, row) => sum + row.minutes, 0);
  const runningTodayMinutes = phase === "live" ? todayMinutes + (total - remaining) / 60 : todayMinutes;
  const todayProgress = Math.min(100, (runningTodayMinutes / 120) * 100);
  // friend groups: online, incoming requests, outgoing requests
  const onlineFriends = friends.filter((f) => f.online);
  const incomingRequests = friends.filter(
    (f) => f.status === "pending" && f.direction !== "outgoing"
  );
  const outgoingRequests = friends.filter(
    (f) => f.status === "pending" && f.direction === "outgoing"
  );

  // pick the reward tier that matches the focused minutes
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

  // load the signed-in user's id and display name
  useEffect(() => {
    async function loadProfile() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);
      const { data } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", user.id)
        .single();
      if (data?.display_name) setDisplayName(data.display_name);
    }
    loadProfile();
  }, [supabase]);

  // load pending quests for the "Linked Task" select
  useEffect(() => {
    fetch("/api/quests?status=pending")
      .then((res) => res.json())
      .then((data) => {
        const list = (data.quests ?? []).map((q: { id: string; title: string }) => ({
          id: q.id,
          title: q.title,
        }));
        setQuests(list);
        if (list.length > 0) setLinkedTask((prev) => prev ?? list[0].id);
      })
      .catch(() => undefined);
  }, []);

  // load reward tiers (coins / XP / pet energy) for the summary
  useEffect(() => {
    supabase
      .from("focus_reward_tiers")
      .select("duration_min, coins, pet_energy, streak_xp")
      .order("duration_min", { ascending: true })
      .then(({ data, error }) => {
        if (!error && Array.isArray(data)) setRewardTiers(data);
      });
  }, [supabase]);

  // fetch the friends list
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

  // refresh the focus history from the backend
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

  // create the room on the backend, remembering the promise so it only happens once
  const createRoom = (overrides?: { duration?: number; name?: string; goal?: string }) => {
    const promise = (async (): Promise<string | null> => {
      setRoomId(null);
      setRoomCode(null);
      try {
        const res = await fetch("/api/rooms", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            duration_minutes: overrides?.duration ?? selectedMinutes,
            name: (overrides?.name ?? roomName).trim() || undefined,
            goal: (overrides?.goal ?? studyGoal).trim() || undefined,
            linked_task_id: linkedTask || undefined,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.room?.id) {
            const id = String(data.room.id);
            setRoomId(id);
            if (data.room.code) setRoomCode(String(data.room.code));
            return id;
          }
        }
      } catch {
        return null;
      }
      return null;
    })();
    roomPromiseRef.current = promise;
    return promise;
  };

  // reuse the room we already created, or create it now
  const ensureRoom = async (): Promise<string | null> => {
    if (roomId) return roomId;
    if (roomPromiseRef.current) return roomPromiseRef.current;
    return createRoom();
  };

  // merge room + participant data from the API into local state
  const applyRoomState = (state: {
    room?: Record<string, unknown>;
    participants?: unknown[];
  }) => {
    const room = (state?.room ?? state) as Record<string, unknown>;
    if (typeof room?.owner_id === "string") setOwnerId(room.owner_id);
    if (joinedRoom) {
      if (typeof room?.name === "string" && room.name) setRoomName(room.name);
      if (typeof room?.study_goal === "string" && room.study_goal) setStudyGoal(room.study_goal);
    }

    const rows = Array.isArray(state?.participants) ? state.participants : [];
    type RoomMember = {
      name: string;
      status: Participant["status"] | undefined;
      userId: string | undefined;
    };
    const mapped = rows
      .map((r): RoomMember | null => {
        const rec = r as Record<string, unknown>;
        const name =
          typeof rec.display_name === "string"
            ? rec.display_name
            : typeof rec.name === "string"
              ? rec.name
              : null;
        if (!name) return null;
        const status =
          typeof rec.status === "string" && rec.status in STATUS_META
            ? (rec.status as Participant["status"])
            : undefined;
        const uid = typeof rec.user_id === "string" ? rec.user_id : undefined;
        return { name, status, userId: uid };
      })
      .filter((p): p is RoomMember => p !== null);

    const self = mapped.find((p) => (userId && p.userId === userId) || p.name === displayName);
    if (self?.status) setOwnStatus(self.status);

    const others = mapped.filter(
      (p) => !(userId && p.userId === userId) && p.name !== displayName
    );
    setParticipants(
      [...new Map(others.map((p) => [p.userId ?? p.name, p])).values()].map((p) => ({
        name: p.name,
        initials: initialsOf(p.name),
        color: colorFor(p.name),
        status: p.status,
        userId: p.userId,
      }))
    );
  };

  // join a room using its invite code
  const joinRoomWithCode = async (rawCode: string) => {
    const code = rawCode.trim().toUpperCase();
    if (!code) {
      notifications.show({
        title: "Missing code",
        message: "Enter the invite code to join a room.",
        color: "red",
      });
      return;
    }
    setJoining(true);
    try {
      const res = await fetch("/api/rooms/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (!res.ok || !data.room_id) {
        notifications.show({
          title: "Could not join",
          message: data.error ?? "Check the invite code and try again.",
          color: "red",
        });
        return;
      }
      const id = String(data.room_id);
      setRoomId(id);
      setRoomCode(code);
      setJoinedRoom(true);
      setJoinCode("");
      finishingRef.current = false;
      const stateRes = await fetch(`/api/rooms/${encodeURIComponent(id)}`);
      if (stateRes.ok) {
        const state = await stateRes.json();
        applyRoomState(state);
        const room = state?.room ?? state;
        const minutes = Number(room?.duration_minutes);
        if (Number.isFinite(minutes) && minutes > 0) {
          if (PRESET_MINUTES.includes(minutes)) {
            setDurationPreset(minutes);
          } else {
            setDurationPreset("custom");
            setCustomMinutes(minutes);
          }
        }
      }
      notifications.show({
        title: "Joined room",
        message: "You're in. The shared timer starts when the host begins.",
        color: "green",
      });
    } catch {
      notifications.show({
        title: "Could not join",
        message: "You appear to be offline.",
        color: "red",
      });
    } finally {
      setJoining(false);
    }
  };

  // on mount: load friends and history, then join from the invite link or create a room
  useEffect(() => {
    const t = setTimeout(() => {
      loadFriends();
      refreshHistory();
      const params = new URLSearchParams(window.location.search);
      const invite = params.get("code");
      if (invite) {
        window.history.replaceState({}, "", window.location.pathname);
        joinRoomWithCode(invite);
      } else {
        createRoom();
      }
    }, 0);
    return () => clearTimeout(t);
  }, []);

  // while live: poll the room so members stay in sync and the leader can end it for everyone
  useEffect(() => {
    if (phase !== "live" || !roomId) return;
    const poll = setInterval(async () => {
      try {
        const res = await fetch(`/api/rooms/${encodeURIComponent(roomId)}`);
        if (!res.ok) return;
        const data = await res.json();
        applyRoomState(data);
        const room = data?.room ?? data;
        const status = typeof room?.status === "string" ? room.status : null;
        if ((status === "ended" || status === "completed") && !finishingRef.current) {
          notifications.show({
            title: "Session ended",
            message: "The room leader ended the session for everyone.",
            color: "blue",
          });
          finishSessionRef.current(remainingRef.current <= 0);
        }
      } catch {
        return;
      }
    }, 5000);
    return () => clearInterval(poll);
  }, [phase, roomId, userId, displayName]);

  // while in the lobby: poll the room so members follow when the leader starts
  useEffect(() => {
    if (phase !== "lobby" || !roomId) return;
    const poll = setInterval(async () => {
      try {
        const res = await fetch(`/api/rooms/${encodeURIComponent(roomId)}`);
        if (!res.ok) return;
        const data = await res.json();
        applyRoomState(data);
        if (!joinedRoom) return;
        const room = data?.room ?? data;
        const status = typeof room?.status === "string" ? room.status : null;
        if (status && !["active", "focus"].includes(status)) return;
        if (typeof room?.started_at !== "string") return;
        const minutes = Number(room?.duration_minutes);
        if (!Number.isFinite(minutes) || minutes <= 0) return;
        const elapsed = Math.floor((Date.now() - new Date(room.started_at).getTime()) / 1000);
        const left = Math.round(minutes * 60 - elapsed);
        if (left <= 0) return;
        if (PRESET_MINUTES.includes(minutes)) {
          setDurationPreset(minutes);
        } else {
          setDurationPreset("custom");
          setCustomMinutes(minutes);
        }
        setRemaining(left);
        setSessionStartedAt(room.started_at);
        setRunning(true);
        setPhase("live");
        fetch(`/api/rooms/${encodeURIComponent(roomId)}/status`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "focus" }),
        }).catch(() => undefined);
        notifications.show({
          title: "Room started",
          message: "The leader started the shared timer. Lock in!",
          color: "blue",
        });
      } catch {
        return;
      }
    }, 5000);
    return () => clearInterval(poll);
  }, [phase, joinedRoom, roomId, userId, displayName]);

  // debounce-save the room name and goal while the leader types
  useEffect(() => {
    if (phase !== "lobby" || joinedRoom || !roomId) return;
    const name = roomName.trim();
    const goal = studyGoal.trim();
    if (!name && !goal) return;
    const t = setTimeout(() => {
      fetch(`/api/rooms/${encodeURIComponent(roomId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, goal }),
      }).catch(() => undefined);
    }, 800);
    return () => clearTimeout(t);
  }, [phase, joinedRoom, roomId, roomName, studyGoal]);

  // save the session, then show the summary with rewards
  const finishSession = (completed: boolean) => {
    if (finishingRef.current) return;
    finishingRef.current = true;
    setRunning(false);
    setOwnStatus("completed");
    const elapsed = total - remaining;
    const actualMinutes = completed
      ? selectedMinutes
      : Math.max(1, Math.round(elapsed / 60));
    const result: SessionResult = {
      roomName: roomName.trim() || "Focus Room",
      studyGoal: studyGoal.trim() || "No goal set",
      linkedTask: linkedTask ? quests.find((q) => q.id === linkedTask)?.title ?? linkedTask : null,
      plannedMinutes: selectedMinutes,
      actualMinutes,
      participantNames: [youParticipant.name, ...participants.map((p) => p.name)],
      completed,
    };
    setSessionResult(result);
    const endedAt = new Date().toISOString();
    void (async () => {
      const id = roomId ?? (await ensureRoom());
      try {
        const res = await fetch("/api/focus-sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            room_id: id,
            started_at: sessionStartedAt ?? endedAt,
            ended_at: endedAt,
            duration_min: actualMinutes,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!data?.saved) {
          notifications.show({
            title: "Session not saved",
            message:
              data?.error ??
              "The session could not be saved. Check that the complete_focus_session SQL has been run.",
            color: "red",
          });
        }
      } catch {
        notifications.show({
          title: "Session not saved",
          message: "You appear to be offline.",
          color: "red",
        });
      }
      if (id) {
        fetch(`/api/rooms/${encodeURIComponent(id)}/complete`, { method: "POST" }).catch(
          () => undefined
        );
        fetch(`/api/rooms/${encodeURIComponent(id)}/status`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "completed" }),
        }).catch(() => undefined);
      }
    })();
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

  // keep the latest finishSession in a ref so the pollers always call the newest one
  useEffect(() => {
    finishSessionRef.current = finishSession;
  });

  // mirror remaining into a ref so pollers can read the current value
  useEffect(() => {
    remainingRef.current = remaining;
  }, [remaining]);

  // build a looping audio element for the selected ambience (and swap it when the sound changes)
  useEffect(() => {
    if (!soundFile) {
      audioRef.current?.pause();
      audioRef.current = null;
      return;
    }
    const audio = new Audio(soundFile);
    audio.loop = true;
    audio.preload = "auto";
    audioRef.current = audio;
    return () => {
      audio.pause();
      if (audioRef.current === audio) audioRef.current = null;
    };
  }, [soundFile]);

  // play/pause ambience with the timer and apply the volume
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = volume / 100;
    if (running && phase === "live") {
      void audio.play().catch(() => undefined);
    } else {
      audio.pause();
    }
  }, [running, phase, soundFile, volume]);

  // one tick per second while the session is running
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

  // when the countdown reaches zero, finish the session
  useEffect(() => {
    if (phase === "live" && !running && remaining === 0) {
      const t = setTimeout(() => finishSession(true), 0);
      return () => clearTimeout(t);
    }
  }, [phase, running, remaining]);


  // leader starts the shared timer for everyone
  const startSession = () => {
    if (!isLeader) {
      notifications.show({
        title: "Only the leader can start",
        message: "Wait for the room leader to start the shared session.",
        color: "yellow",
      });
      return;
    }
    finishingRef.current = false;
    setRemaining(total);
    setRunning(true);
    setPhase("live");
    setSessionStartedAt(new Date().toISOString());
    setOwnStatus("focus");
    void (async () => {
      const id = await ensureRoom();
      if (!id) {
        notifications.show({
          title: "Room not saved",
          message: "Could not create the room. Check your connection and try again.",
          color: "red",
        });
        return;
      }
      fetch(`/api/rooms/${encodeURIComponent(id)}/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: roomName.trim() || undefined,
          goal: studyGoal.trim() || undefined,
          linked_task_id: linkedTask || undefined,
          duration_minutes: selectedMinutes,
        }),
      })
        .then(async (res) => {
          if (res.ok) return;
          const data = await res.json().catch(() => ({}));
          notifications.show({
            title: "Room settings not saved",
            message: data.error ?? "The room could not be started on the server.",
            color: "red",
          });
        })
        .catch(() => undefined);
      fetch(`/api/rooms/${encodeURIComponent(id)}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "focus" }),
      }).catch(() => undefined);
    })();
  };

  // pause or resume the countdown (and tell the room)
  const toggleRunning = () => {
    const next = !running;
    setRunning(next);
    setOwnStatus(next ? "focus" : "break");
    if (roomId) {
      fetch(`/api/rooms/${encodeURIComponent(roomId)}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next ? "focus" : "break" }),
      }).catch(() => undefined);
    }
  };

  // reset the countdown back to the full duration
  const resetTimer = () => {
    setRunning(false);
    setRemaining(total);
  };

  // end the session before the time runs out
  const endEarly = () => finishSession(false);

  // back to setup for another round
  const backToLobby = () => {
    finishingRef.current = false;
    setPhase("lobby");
    setRunning(false);
    setRemaining(total);
    setParticipants([]);
    setOwnStatus("ready");
    refreshHistory();
    if (joinedRoom) {
      void leaveLobby();
      return;
    }
    createRoom();
  };

  // leave a joined room and start a fresh lobby
  const leaveLobby = async () => {
    if (!joinedRoom) return;
    finishingRef.current = false;
    if (roomId) {
      await fetch(`/api/rooms/${encodeURIComponent(roomId)}/leave`, { method: "POST" }).catch(
        () => undefined
      );
    }
    setJoinedRoom(false);
    setParticipants([]);
    setRoomName("");
    setStudyGoal("");
    setDurationPreset(30);
    setCustomMinutes(45);
    setRemaining(30 * 60);
    setRunning(false);
    notifications.show({
      title: "Left lobby",
      message: "You left the room and got a fresh lobby.",
      color: "blue",
    });
    createRoom({ duration: 30, name: "", goal: "" });
  };

  // invite a friend from the friends list
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
    if (friend.status === "pending") {
      notifications.show({
        title: "Friend request pending",
        message:
          friend.direction === "outgoing"
            ? `${friend.name} hasn't accepted your friend request yet.`
            : `Accept ${friend.name}'s friend request before inviting them.`,
        color: "yellow",
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
        notifications.show({
          title: "Invite sent",
          message: `Waiting for ${friend.name} to accept. They'll appear here once they join.`,
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

  // remove a friend, or cancel a pending request
  const unfriend = async (friend: Friend) => {
    if (friend.id) {
      await fetch(`/api/friends/${encodeURIComponent(friend.id)}`, { method: "DELETE" }).catch(
        () => undefined
      );
    }
    setFriends((fs) => fs.filter((f) => f.name !== friend.name));
    setParticipants((ps) => ps.filter((p) => p.name !== friend.name));
    notifications.show({
      title: friend.status === "pending" ? "Request canceled" : "Unfriended",
      message:
        friend.status === "pending"
          ? `Your friend request to ${friend.name} was canceled.`
          : `${friend.name} was removed from your friends list.`,
      color: "blue",
    });
  };

  // accept or decline an incoming friend request
  const respondToRequest = async (friend: Friend, action: "accept" | "reject") => {
    if (!friend.id) return;
    try {
      const res = await fetch(`/api/friends/requests/${encodeURIComponent(friend.id)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        notifications.show({
          title: "Could not update request",
          message: data.error ?? "Try again later.",
          color: "red",
        });
        return;
      }
      if (action === "accept") {
        setFriends((fs) =>
          fs.map((f) =>
            f.id === friend.id
              ? { ...f, status: "accepted", direction: undefined, online: true }
              : f
          )
        );
        notifications.show({
          title: "Friend added",
          message: `${friend.name} is now your friend.`,
          color: "green",
        });
      } else {
        setFriends((fs) => fs.filter((f) => f.id !== friend.id));
        notifications.show({
          title: "Request declined",
          message: `You declined ${friend.name}'s friend request.`,
          color: "blue",
        });
      }
    } catch {
      notifications.show({
        title: "Could not update request",
        message: "You appear to be offline.",
        color: "red",
      });
    }
  };

  // send a friend request using their user code
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

  // live view: shared countdown, ambience and members
  if (phase === "live") {
    return (
      <Box style={{ backgroundColor: "#F7F9FC", minHeight: "100vh" }}>
        <Box maw={1150} mx="auto" p={{ base: 20, md: 40 }}>
          {/* Header */}
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
            {/* Timer card */}
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

              {/* progress ring */}
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

              {/* controls */}
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
              {/* Ambience section */}
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
                <Group justify="space-between" mt="md" mb={4}>
                  <Group gap={6}>
                    <Volume2 size={15} color="#868E96" />
                    <Text fz="sm" fw={600} c="dimmed">
                      Volume
                    </Text>
                  </Group>
                  <Text fz="xs" fw={600} c="dimmed">
                    {volume}%
                  </Text>
                </Group>
                <Slider
                  value={volume}
                  onChange={setVolume}
                  disabled={!soundFile}
                  size="sm"
                  color="indigo"
                  label={(value) => `${value}%`}
                  aria-label="Ambience volume"
                />
                <Text c="dimmed" fz="xs" mt={10} ta="center">
                  Now playing: {activeSound.label === "Silence" ? "silence" : `${activeSound.label} sounds`}
                </Text>
              </Paper>

              {/* Room members */}
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
                              style={{ borderRadius: 99, backgroundColor: statusOf(p.status).color }}
                            />
                            <Text fz="xs" c="dimmed">
                              {statusOf(p.status).label}
                            </Text>
                          </Group>
                        </Box>
                      </Group>
                      <Group gap={6} wrap="nowrap">
                        {isParticipantLeader(p) && (
                          <Badge
                            variant="light"
                            color="yellow"
                            size="xs"
                            radius="xl"
                            leftSection={<Crown size={10} />}
                          >
                            Leader
                          </Badge>
                        )}
                        {p.status === "focus" && (
                          <Badge variant="light" color="green" size="xs" radius="xl">
                            <Flame size={10} />
                          </Badge>
                        )}
                      </Group>
                    </Group>
                  ))}
                </Stack>
              </Paper>
            </Stack>
          </SimpleGrid>

          {/* Today's focus goal */}
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

  // summary view: session report + rewards
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
            {/* result header */}
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

            {/* session details */}
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

            {/* rewards earned */}
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

            {/* actions */}
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

  // lobby / setup view
  return (
    <Box style={{ backgroundColor: "#F7F9FC", minHeight: "100vh" }}>
      <Box maw={1150} mx="auto" p={{ base: 20, md: 40 }}>
        {/* Header */}
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
            {/* Room setup */}
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
                  disabled={!isLeader}
                />
                <TextInput
                  label="Study Goal"
                  value={studyGoal}
                  onChange={(e) => setStudyGoal(e.currentTarget.value)}
                  disabled={!isLeader}
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
                        disabled={!isLeader}
                      >
                        {m}m
                      </Button>
                    ))}
                    <Button
                      size="xs"
                      radius="xl"
                      variant={durationPreset === "custom" ? "filled" : "default"}
                      onClick={() => setDurationPreset("custom")}
                      disabled={!isLeader}
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
                      disabled={!isLeader}
                    />
                  )}
                </Box>

                <Select
                  label="Linked Task"
                  data={quests.map((q) => ({ value: q.id, label: q.title }))}
                  value={linkedTask}
                  onChange={(v) => setLinkedTask(v)}
                  searchable
                  clearable
                  nothingFoundMessage="No pending quests"
                  disabled={!isLeader}
                />

                <Button
                  size="md"
                  fullWidth
                  mt="sm"
                  leftSection={isLeader ? <Play size={16} /> : <Lock size={16} />}
                  onClick={startSession}
                  disabled={!isLeader}
                >
                  {isLeader ? "Start Focus Room" : "Waiting for leader to start"}
                </Button>

                <Divider label="Or join a friend's room" labelPosition="center" my={4} />

                <Group gap="xs" align="flex-end" wrap="nowrap">
                  <TextInput
                    label="Invite Code"
                    placeholder="ABCD12"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.currentTarget.value.toUpperCase())}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") joinRoomWithCode(joinCode);
                    }}
                    style={{ flex: 1 }}
                  />
                  <Button
                    variant="default"
                    leftSection={<LogIn size={16} />}
                    onClick={() => joinRoomWithCode(joinCode)}
                    loading={joining}
                  >
                    Join
                  </Button>
                </Group>
              </Stack>
            </Paper>
          </Stack>

          <Stack gap="md">
            {/* lobby participants */}
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
                          {isParticipantLeader(p)
                            ? p.isYou
                              ? "You · Leader"
                              : "Leader"
                            : p.isYou
                              ? "You"
                              : "In lobby"}
                        </Text>
                      </Box>
                    </Group>
                    {isParticipantLeader(p) ? (
                      <Badge
                        variant="light"
                        color="yellow"
                        size="xs"
                        radius="xl"
                        leftSection={<Crown size={10} />}
                      >
                        Leader
                      </Badge>
                    ) : (
                      <Badge variant="light" color={p.isYou ? "blue" : "green"} size="xs" radius="xl">
                        {p.isYou ? "You" : "Ready"}
                      </Badge>
                    )}
                  </Group>
                ))}
                {lobbyParticipants.length < MAX_PARTICIPANTS && (
                  <Text c="dimmed" fz="xs" ta="center">
                    Invite friends to fill the room
                  </Text>
                )}
              </Stack>
              {joinedRoom && (
                <Button
                  fullWidth
                  mt="sm"
                  variant="light"
                  color="red"
                  leftSection={<LogOut size={14} />}
                  onClick={leaveLobby}
                >
                  Leave Lobby
                </Button>
              )}
            </Paper>

            {/* friends online */}
            <Paper p="lg" radius="lg" shadow="sm" withBorder>
              <Group gap={8} mb="md">
                <ThemeIcon radius="lg" variant="light" color="indigo" size={32}>
                  <Users size={18} />
                </ThemeIcon>
                <Title order={3} fz="lg" fw={700}>
                  Friends Online
                </Title>
              </Group>

              {/* incoming friend requests */}
              {incomingRequests.length > 0 && (
                <Stack gap="xs" mb="md">
                  {incomingRequests.map((f) => (
                    <Group
                      key={f.id ?? f.userId ?? f.name}
                      justify="space-between"
                      p="xs"
                      style={{ borderRadius: 10, backgroundColor: "#FFF9DB" }}
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
                          <Text fz="xs" c="dimmed">
                            Wants to be friends
                          </Text>
                        </Box>
                      </Group>
                      <Group gap={4}>
                        <Tooltip label="Accept">
                          <ActionIcon
                            variant="light"
                            color="green"
                            aria-label={`Accept friend request from ${f.name}`}
                            onClick={() => respondToRequest(f, "accept")}
                          >
                            <Check size={14} />
                          </ActionIcon>
                        </Tooltip>
                        <Tooltip label="Decline">
                          <ActionIcon
                            variant="light"
                            color="red"
                            aria-label={`Decline friend request from ${f.name}`}
                            onClick={() => respondToRequest(f, "reject")}
                          >
                            <X size={14} />
                          </ActionIcon>
                        </Tooltip>
                      </Group>
                    </Group>
                  ))}
                </Stack>
              )}

              {/* outgoing friend requests */}
              {outgoingRequests.length > 0 && (
                <Stack gap="xs" mb="md">
                  {outgoingRequests.map((f) => (
                    <Group
                      key={f.id ?? f.userId ?? f.name}
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
                          <Text fz="xs" c="dimmed">
                            Request pending
                          </Text>
                        </Box>
                      </Group>
                      <Tooltip label="Cancel request">
                        <ActionIcon
                          variant="subtle"
                          color="gray"
                          aria-label={`Cancel friend request to ${f.name}`}
                          onClick={() => unfriend(f)}
                        >
                          <UserMinus size={14} />
                        </ActionIcon>
                      </Tooltip>
                    </Group>
                  ))}
                </Stack>
              )}

              {/* online friends */}
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

              {/* invite actions */}
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

        {/* focus room history */}
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
            <Text fz="xs" fw={700} tt="uppercase" c="dimmed" ta='end'>
              Sprint Time
            </Text>
            <Text fz="xs" fw={700} tt="uppercase" c="dimmed" ta='end'>
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
                <Text fz="sm" fw={600} truncate style={{ flex: 1 }} maw={340}>
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

      {/* add friend modal */}
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