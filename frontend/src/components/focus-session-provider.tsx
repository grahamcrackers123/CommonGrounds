"use client";

import { DEFAULT_MAX_PARTICIPANTS, clampMaxParticipants } from "@/lib/rooms";
import {
  type Friend,
  type HistoryRow,
  type Participant,
  type ParticipantStatus,
  type Phase,
  type RewardTier,
  type SessionResult,
  PRESET_MINUTES,
  SOUNDS,
  STATUS_META,
  colorFor,
  initialsOf,
  loadHistory,
  mapBackendFriend,
  mapHistoryRow,
} from "@/lib/focus-session";
import { createClient } from "@/lib/supabase/client";
import { notifications } from "@mantine/notifications";
import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

interface FocusSessionContextValue {
  phase: Phase;
  roomName: string;
  setRoomName: (value: string) => void;
  studyGoal: string;
  setStudyGoal: (value: string) => void;
  durationPreset: number | "custom";
  setDurationPreset: (value: number | "custom") => void;
  customMinutes: number;
  setCustomMinutes: (value: number) => void;
  maxParticipants: number;
  setMaxParticipants: (value: number) => void;
  linkedTask: string | null;
  setLinkedTask: (value: string | null) => void;
  quests: { id: string; title: string }[];
  rewardTiers: RewardTier[];
  friends: Friend[];
  participants: Participant[];
  displayName: string;
  userId: string | null;
  ownerId: string | null;
  ownStatus: ParticipantStatus | undefined;
  roomId: string | null;
  roomCode: string | null;
  history: HistoryRow[];
  inviteModalOpen: boolean;
  setInviteModalOpen: (value: boolean) => void;
  friendCode: string;
  setFriendCode: (value: string) => void;
  friendReqSending: boolean;
  joinCode: string;
  setJoinCode: (value: string) => void;
  joining: boolean;
  joinedRoom: boolean;
  restoring: boolean;
  remaining: number;
  running: boolean;
  sound: string;
  setSound: (value: string) => void;
  volume: number;
  setVolume: (value: number) => void;
  sessionResult: SessionResult | null;
  isLeader: boolean;
  youParticipant: Participant;
  lobbyParticipants: Participant[];
  isParticipantLeader: (participant: Participant) => boolean;
  selectedMinutes: number;
  total: number;
  progress: number;
  activeSound: (typeof SOUNDS)[number];
  soundFile: string | null;
  inviteCode: string;
  todaySessions: number;
  todayMinutes: number;
  runningTodayMinutes: number;
  todayProgress: number;
  onlineFriends: Friend[];
  incomingRequests: Friend[];
  outgoingRequests: Friend[];
  enterFocusRoom: (inviteCode?: string | null) => void;
  startSession: () => void;
  toggleRunning: () => void;
  resetTimer: () => void;
  endEarly: () => void;
  backToLobby: () => void;
  leaveLobby: () => Promise<void>;
  joinRoomWithCode: (rawCode: string) => Promise<void>;
  inviteFriend: (friend: Friend) => Promise<void>;
  unfriend: (friend: Friend) => Promise<void>;
  respondToRequest: (friend: Friend, action: "accept" | "reject") => Promise<void>;
  submitAddFriend: () => Promise<void>;
}

const FocusSessionContext = createContext<FocusSessionContextValue | null>(null);

export function useFocusSession() {
  const value = useContext(FocusSessionContext);
  if (!value) {
    throw new Error("useFocusSession must be used inside FocusSessionProvider");
  }
  return value;
}

export function FocusSessionProvider({ children }: { children: ReactNode }) {
  const supabase = useMemo(() => createClient(), []);

  const roomPromiseRef = useRef<Promise<string | null> | null>(null);
  const finishingRef = useRef(false);
  const finishSessionRef = useRef<(completed: boolean) => void>(() => {});
  const remainingRef = useRef(30 * 60);
  const elapsedRef = useRef(0);
  const runningSinceRef = useRef<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const savedMaxRef = useRef(DEFAULT_MAX_PARTICIPANTS);
  const inviteHandledRef = useRef<string | null>(null);
  const restoredRef = useRef(false);
  const pendingEnterRef = useRef<string | null | undefined>(undefined);

  const [phase, setPhase] = useState<Phase>("lobby");

  const [roomName, setRoomName] = useState("");
  const [studyGoal, setStudyGoal] = useState("");
  const [durationPreset, setDurationPreset] = useState<number | "custom">(30);
  const [customMinutes, setCustomMinutes] = useState(45);
  const [maxParticipants, setMaxParticipants] = useState(DEFAULT_MAX_PARTICIPANTS);
  const [linkedTask, setLinkedTask] = useState<string | null>(null);
  const [quests, setQuests] = useState<{ id: string; title: string }[]>([]);
  const [rewardTiers, setRewardTiers] = useState<RewardTier[]>([]);

  const [friends, setFriends] = useState<Friend[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [displayName, setDisplayName] = useState("You");
  const [userId, setUserId] = useState<string | null>(null);
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [ownStatus, setOwnStatus] = useState<ParticipantStatus>();
  const [roomId, setRoomId] = useState<string | null>(null);
  const [roomCode, setRoomCode] = useState<string | null>(null);

  const [history, setHistory] = useState<HistoryRow[]>(loadHistory);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [friendCode, setFriendCode] = useState("");
  const [friendReqSending, setFriendReqSending] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [joining, setJoining] = useState(false);
  const [joinedRoom, setJoinedRoom] = useState(false);
  const [restoring, setRestoring] = useState(true);

  const [remaining, setRemaining] = useState(30 * 60);
  const [running, setRunning] = useState(false);
  const [sound, setSound] = useState("rain");
  const [volume, setVolume] = useState(60);
  const [sessionResult, setSessionResult] = useState<SessionResult | null>(null);
  const [sessionStartedAt, setSessionStartedAt] = useState<string | null>(null);

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
  const activeSound = SOUNDS.find((s) => s.key === sound) ?? SOUNDS[0];
  const soundFile = activeSound.audio;
  const inviteCode = roomCode ?? "";

  const todayRows = history.filter(
    (h) => new Date(h.date).toDateString() === new Date().toDateString()
  );
  const todaySessions = todayRows.length;
  const todayMinutes = todayRows.reduce((sum, row) => sum + row.minutes, 0);
  const runningTodayMinutes =
    phase === "live" ? todayMinutes + (total - remaining) / 60 : todayMinutes;
  const todayProgress = Math.min(100, (runningTodayMinutes / 120) * 100);
  const onlineFriends = friends.filter((f) => f.online);
  const incomingRequests = friends.filter(
    (f) => f.status === "pending" && f.direction !== "outgoing"
  );
  const outgoingRequests = friends.filter(
    (f) => f.status === "pending" && f.direction === "outgoing"
  );

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

  // load pending quests for the "Linked Task" select
  const loadQuests = async () => {
    try {
      const res = await fetch("/api/quests?status=pending");
      const data = await res.json();
      const list = (data.quests ?? []).map((q: { id: string; title: string }) => ({
        id: q.id,
        title: q.title,
      }));
      setQuests(list);
    } catch {
      return;
    }
  };

  // load reward tiers (coins / XP / pet energy) for the summary
  const loadRewardTiers = async () => {
    const { data, error } = await supabase
      .from("focus_reward_tiers")
      .select("duration_min, coins, pet_energy, streak_xp")
      .order("duration_min", { ascending: true });
    if (!error && Array.isArray(data)) setRewardTiers(data);
  };

  // create the room on the backend, remembering the promise so it only happens once
  const createRoom = (overrides?: {
    duration?: number;
    name?: string;
    goal?: string;
    maxParticipants?: number;
  }) => {
    const promise = (async (): Promise<string | null> => {
      setRoomId(null);
      setRoomCode(null);
      const sentMax = clampMaxParticipants(overrides?.maxParticipants ?? maxParticipants);
      try {
        const res = await fetch("/api/rooms", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            duration_minutes: overrides?.duration ?? selectedMinutes,
            name: (overrides?.name ?? roomName).trim() || undefined,
            goal: (overrides?.goal ?? studyGoal).trim() || undefined,
            linked_task_id: linkedTask || undefined,
            max_participants: sentMax,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.room?.id) {
            const id = String(data.room.id);
            setRoomId(id);
            if (data.room.code) setRoomCode(String(data.room.code));
            savedMaxRef.current = sentMax;
            return id;
          }
        }
      } catch {
        return null;
      }
      return null;
    })();
    roomPromiseRef.current = promise;
    void promise.then((id) => {
      if (!id && roomPromiseRef.current === promise) roomPromiseRef.current = null;
    });
    return promise;
  };

  // reuse the room we already created, or create it now
  const ensureRoom = async (): Promise<string | null> => {
    if (roomId) return roomId;
    if (roomPromiseRef.current) return roomPromiseRef.current;
    return createRoom();
  };

  // merge room + participant data from the API into local state
  const applyRoomState = (
    state: {
      room?: Record<string, unknown>;
      participants?: unknown[];
    },
    overrides?: { userId?: string | null; displayName?: string; joinedRoom?: boolean }
  ) => {
    const currentUserId = overrides?.userId !== undefined ? overrides.userId : userId;
    const currentDisplayName = overrides?.displayName ?? displayName;
    const currentJoinedRoom = overrides?.joinedRoom ?? joinedRoom;
    const room = (state?.room ?? state) as Record<string, unknown>;
    if (typeof room?.owner_id === "string") setOwnerId(room.owner_id);
    if (currentJoinedRoom) {
      if (typeof room?.name === "string" && room.name) setRoomName(room.name);
      if (typeof room?.study_goal === "string" && room.study_goal) setStudyGoal(room.study_goal);
      if (typeof room?.max_participants === "number")
        setMaxParticipants(clampMaxParticipants(room.max_participants));
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

    const self = mapped.find(
      (p) => (currentUserId && p.userId === currentUserId) || p.name === currentDisplayName
    );
    if (self?.status) setOwnStatus(self.status);

    const others = mapped.filter(
      (p) => !(currentUserId && p.userId === currentUserId) && p.name !== currentDisplayName
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

  // rebuild a running session from the server after a full reload or in a new tab
  const hydrateActiveRoom = (data: Record<string, unknown>) => {
    const room = ((data.room ?? data) ?? {}) as Record<string, unknown>;
    const activeRoomId = typeof room.id === "string" ? room.id : null;
    const startedAt = typeof room.started_at === "string" ? room.started_at : null;
    const minutes = Number(room.duration_minutes);
    const startedMs = startedAt ? new Date(startedAt).getTime() : Number.NaN;
    if (!activeRoomId || !startedAt || !Number.isFinite(startedMs) || !Number.isFinite(minutes) || minutes <= 0) {
      return false;
    }

    const elapsed = Math.max(0, (Date.now() - startedMs) / 1000);
    const left = Math.ceil(minutes * 60 - elapsed);
    if (left <= 0) return false;

    const currentUserId =
      typeof data.currentUserId === "string" ? data.currentUserId : userId;
    const currentUserName =
      typeof data.currentUserName === "string" && data.currentUserName
        ? data.currentUserName
        : undefined;

    const rows = Array.isArray(data.participants)
      ? (data.participants as Record<string, unknown>[])
      : [];
    const self = currentUserId
      ? rows.find((row) => row.user_id === currentUserId)
      : undefined;
    if (self?.status === "completed") return false;

    const owner = typeof room.owner_id === "string" ? room.owner_id : null;
    const isJoined = owner != null && currentUserId != null && owner !== currentUserId;
    const nextDisplayName = currentUserName ?? displayName;

    if (currentUserId) setUserId(currentUserId);
    setDisplayName(nextDisplayName);
    setJoinedRoom(isJoined);
    setRoomId(activeRoomId);
    const code =
      (typeof data.code === "string" && data.code) ||
      (typeof room.code === "string" && room.code) ||
      null;
    setRoomCode(code);
    setRoomName(typeof room.name === "string" ? room.name : "");
    setStudyGoal(typeof room.study_goal === "string" ? room.study_goal : "");
    setMaxParticipants(
      typeof room.max_participants === "number"
        ? clampMaxParticipants(room.max_participants)
        : DEFAULT_MAX_PARTICIPANTS
    );
    setLinkedTask(typeof room.linked_task_id === "string" ? room.linked_task_id : null);
    if (PRESET_MINUTES.includes(minutes)) {
      setDurationPreset(minutes);
    } else {
      setDurationPreset("custom");
      setCustomMinutes(minutes);
    }
    applyRoomState(
      { room, participants: rows },
      {
        userId: currentUserId ?? null,
        displayName: nextDisplayName,
        joinedRoom: isJoined,
      }
    );
    const paused = self?.status === "break";
    elapsedRef.current = minutes * 60 - left;
    runningSinceRef.current = paused ? null : Date.now();
    setRemaining(left);
    setSessionStartedAt(startedAt);
    setRunning(!paused);
    setOwnStatus(paused ? "break" : "focus");
    finishingRef.current = false;
    setPhase("live");
    return true;
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

  // resume a running session after a full reload (or in a new tab)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      let restored = false;
      try {
        const res = await fetch("/api/rooms/active");
        if (res.ok) {
          const data = await res.json();
          if (!cancelled && data && (data.room || data.id)) {
            restored = hydrateActiveRoom(data as Record<string, unknown>);
          }
        }
      } catch {
        // Offline: fall through so the lobby can still open.
      }
      if (cancelled) return;
      restoredRef.current = true;
      setRestoring(false);
      const pending = pendingEnterRef.current;
      pendingEnterRef.current = undefined;
      if (restored || pending === undefined) return;
      if (pending) {
        void joinRoomWithCode(pending);
      } else {
        createRoom();
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // while in the lobby: poll the room so members follow when the leader starts
  useEffect(() => {
    if (phase !== "lobby" || !roomId) return;

    const refresh = async () => {
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
        elapsedRef.current = minutes * 60 - left;
        runningSinceRef.current = Date.now();
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
    };

    const channel = supabase
      .channel(`room-lobby-${roomId}`)
      .on("postgres_changes",
        { event: "*", schema: "public", table: "rooms", filter: `id=eq.${roomId}` },
        refresh)
      .on("postgres_changes",
        { event: "*", schema: "public", table: "room_participants", filter: `room_id=eq.${roomId}` },
        refresh)
      .subscribe((status) => {
        if (status === "SUBSCRIBED") refresh();
      });

    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, joinedRoom, roomId, userId, displayName]);

  // while live: poll the room so members stay in sync and the leader can end it for everyone
  useEffect(() => {
    if (phase !== "live" || !roomId) return;

    const refresh = async () => {
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
    };

    const channel = supabase
      .channel(`room-live-${roomId}`)
      .on("postgres_changes",
        { event: "*", schema: "public", table: "rooms", filter: `id=eq.${roomId}` },
        refresh)
      .on("postgres_changes",
        { event: "*", schema: "public", table: "room_participants", filter: `room_id=eq.${roomId}` },
        refresh)
      .subscribe((status) => {
        if (status === "SUBSCRIBED") refresh();
      });

    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, roomId, userId, displayName]);

  // debounce-save the room settings while the leader edits
  useEffect(() => {
    if (phase !== "lobby" || joinedRoom || !roomId) return;
    const name = roomName.trim();
    const goal = studyGoal.trim();
    if (!name && !goal && maxParticipants === savedMaxRef.current) return;
    const t = setTimeout(() => {
      fetch(`/api/rooms/${encodeURIComponent(roomId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, goal, max_participants: clampMaxParticipants(maxParticipants) }),
      })
        .then((res) => {
          if (res.ok) savedMaxRef.current = clampMaxParticipants(maxParticipants);
        })
        .catch(() => undefined);
    }, 800);
    return () => clearTimeout(t);
  }, [phase, joinedRoom, roomId, roomName, studyGoal, maxParticipants]);

  // save the session, then show the summary with rewards
  const finishSession = (completed: boolean) => {
    if (finishingRef.current) return;
    finishingRef.current = true;
    const elapsedSeconds =
      elapsedRef.current +
      (runningSinceRef.current ? (Date.now() - runningSinceRef.current) / 1000 : 0);
    runningSinceRef.current = null;
    setRunning(false);
    setOwnStatus("completed");
    const actualMinutes = completed
      ? selectedMinutes
      : Math.max(1, Math.round(elapsedSeconds / 60));
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
    const startedAt = sessionStartedAt ?? endedAt;
    void (async () => {
      const id = roomId ?? (await ensureRoom());
      try {
        const res = await fetch("/api/focus-sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            room_id: id,
            started_at: startedAt,
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
        // The owner can end the room at any time. When the timer has
        // actually finished, any member may close it so an absent
        // host cannot leave everyone stuck in an active room.
        const isRoomOwner = !ownerId || ownerId === userId;
        if (isRoomOwner || completed) {
          fetch(`/api/rooms/${encodeURIComponent(id)}/complete`, { method: "POST" })
            .then((res) => {
              if (!res.ok && isRoomOwner) {
                notifications.show({
                  title: "Room not closed",
                  message: "Other participants may still see this room as active.",
                  color: "yellow",
                });
              }
            })
            .catch(() => undefined);
        }
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
    if (typeof window !== "undefined" && window.location.pathname !== "/focusroom") {
      notifications.show({
        title: completed ? "Focus session complete" : "Focus session ended",
        message: completed
          ? "Your focus session finished. Come back to see your rewards."
          : "Your focus session has ended. Come back to see your summary.",
        color: completed ? "green" : "blue",
      });
    }
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
    if (phase !== "live" || !soundFile) {
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
  }, [soundFile, phase]);

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

  // tick against the wall clock so the countdown stays accurate while browsing
  useEffect(() => {
    if (!running || phase !== "live") return;
    const tick = () => {
      const elapsed =
        elapsedRef.current +
        (runningSinceRef.current ? (Date.now() - runningSinceRef.current) / 1000 : 0);
      const left = Math.max(0, Math.ceil(total - elapsed));
      setRemaining(left);
      if (left <= 0) setRunning(false);
    };
    tick();
    const interval = setInterval(tick, 500);
    return () => clearInterval(interval);
  }, [running, phase, total]);

  // when the countdown reaches zero, finish the session
  useEffect(() => {
    if (phase === "live" && !running && remaining === 0) {
      const t = setTimeout(() => finishSessionRef.current(true), 0);
      return () => clearTimeout(t);
    }
  }, [phase, running, remaining]);

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
    elapsedRef.current = 0;
    runningSinceRef.current = Date.now();
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
          max_participants: clampMaxParticipants(maxParticipants),
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
    if (running) {
      if (runningSinceRef.current) {
        elapsedRef.current += (Date.now() - runningSinceRef.current) / 1000;
        runningSinceRef.current = null;
      }
    } else {
      runningSinceRef.current = Date.now();
    }
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
    elapsedRef.current = 0;
    runningSinceRef.current = null;
    setRunning(false);
    setRemaining(total);
  };

  // end the session before the time runs out
  const endEarly = () => finishSession(false);

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
    setMaxParticipants(DEFAULT_MAX_PARTICIPANTS);
    setRemaining(30 * 60);
    setRunning(false);
    elapsedRef.current = 0;
    runningSinceRef.current = null;
    notifications.show({
      title: "Left lobby",
      message: "You left the room and got a fresh lobby.",
      color: "blue",
    });
    createRoom({
      duration: 30,
      name: "",
      goal: "",
      maxParticipants: DEFAULT_MAX_PARTICIPANTS,
    });
  };

  // back to setup for another round
  const backToLobby = () => {
    finishingRef.current = false;
    setPhase("lobby");
    setRunning(false);
    setRemaining(total);
    elapsedRef.current = 0;
    runningSinceRef.current = null;
    setParticipants([]);
    setOwnStatus("ready");
    setSessionResult(null);
    refreshHistory();
    if (joinedRoom) {
      void leaveLobby();
      return;
    }
    createRoom();
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
    const partySize = clampMaxParticipants(maxParticipants);
    if (participants.length >= partySize - 1) {
      notifications.show({
        title: "Lobby is full",
        message: `The lobby is limited to ${partySize} members.`,
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

  // called when the Focus Room page mounts or the invite link is followed
  const enterFocusRoom = (invite?: string | null) => {
    void loadFriends();
    void refreshHistory();
    void loadQuests();
    void loadRewardTiers();
    if (!restoredRef.current) {
      pendingEnterRef.current = invite ?? null;
      return;
    }
    if (phase !== "lobby") return;
    if (invite) {
      if (inviteHandledRef.current !== invite) {
        inviteHandledRef.current = invite;
        void joinRoomWithCode(invite);
      }
      return;
    }
    if (roomId || roomPromiseRef.current || joining) return;
    createRoom();
  };

  const value: FocusSessionContextValue = {
    phase,
    roomName,
    setRoomName,
    studyGoal,
    setStudyGoal,
    durationPreset,
    setDurationPreset,
    customMinutes,
    setCustomMinutes,
    maxParticipants,
    setMaxParticipants,
    linkedTask,
    setLinkedTask,
    quests,
    rewardTiers,
    friends,
    participants,
    displayName,
    userId,
    ownerId,
    ownStatus,
    roomId,
    roomCode,
    history,
    inviteModalOpen,
    setInviteModalOpen,
    friendCode,
    setFriendCode,
    friendReqSending,
    joinCode,
    setJoinCode,
    joining,
    joinedRoom,
    restoring,
    remaining,
    running,
    sound,
    setSound,
    volume,
    setVolume,
    sessionResult,
    isLeader,
    youParticipant,
    lobbyParticipants,
    isParticipantLeader,
    selectedMinutes,
    total,
    progress,
    activeSound,
    soundFile,
    inviteCode,
    todaySessions,
    todayMinutes,
    runningTodayMinutes,
    todayProgress,
    onlineFriends,
    incomingRequests,
    outgoingRequests,
    enterFocusRoom,
    startSession,
    toggleRunning,
    resetTimer,
    endEarly,
    backToLobby,
    leaveLobby,
    joinRoomWithCode,
    inviteFriend,
    unfriend,
    respondToRequest,
    submitAddFriend,
  };

  return <FocusSessionContext.Provider value={value}>{children}</FocusSessionContext.Provider>;
}
