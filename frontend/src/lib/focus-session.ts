import { AudioLinesOff, CloudRain, Coffee, Trees } from "lucide-react";

export type Phase = "lobby" | "live" | "summary";

export type ParticipantStatus = "ready" | "focus" | "break" | "completed";

export interface Friend {
  id?: string;
  userId?: string;
  name: string;
  initials: string;
  color: string;
  online: boolean;
  status?: "accepted" | "pending";
  direction?: "incoming" | "outgoing";
}

export interface Participant {
  name: string;
  initials: string;
  color: string;
  isYou?: boolean;
  userId?: string;
  status?: ParticipantStatus;
}

export interface HistoryRow {
  id?: string;
  room: string;
  minutes: number;
  date: string;
}

export interface SessionResult {
  roomName: string;
  studyGoal: string;
  linkedTask: string | null;
  plannedMinutes: number;
  actualMinutes: number;
  participantNames: string[];
  completed: boolean;
}

export interface RewardTier {
  duration_min: number;
  coins: number;
  pet_energy: number;
  streak_xp: number;
}

export const PRESET_MINUTES = [15, 30, 45, 60];

export const SOUNDS = [
  { key: "none", label: "Silence", icon: AudioLinesOff, audio: null },
  { key: "rain", label: "Rain", icon: CloudRain, audio: "/sounds/rain-sound.wav" },
  { key: "cafe", label: "Cafe", icon: Coffee, audio: "/sounds/cafe-sound.mp3" },
  { key: "forest", label: "Forest", icon: Trees, audio: "/sounds/forest-sound.wav" },
];

export const FRIEND_COLORS = ["pink", "blue", "orange", "violet", "teal", "grape", "indigo", "cyan"];

export const STATUS_META: Record<string, { label: string; color: string }> = {
  ready: { label: "Ready", color: "light-dark(#ADB5BD, #6C757D)" },
  focus: { label: "Focusing", color: "light-dark(#2F9E44, #51CF66)" },
  break: { label: "On break", color: "light-dark(#F08C00, #FFA94D)" },
  completed: { label: "Finished", color: "light-dark(#868E96, #ADB5BD)" },
};

export const initialsOf = (name: string) =>
  name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

export const colorFor = (name: string) => {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return FRIEND_COLORS[hash % FRIEND_COLORS.length];
};

export const statusOf = (status?: string) =>
  STATUS_META[status ?? "ready"] ?? STATUS_META.ready;

export const fmt = (totalSeconds: number) => {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
};

export const loadHistory = (): HistoryRow[] => {
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

export const mapBackendFriend = (row: Record<string, unknown>): Friend => {
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

export const mapHistoryRow = (row: Record<string, unknown>): HistoryRow => ({
  id: row.id != null ? String(row.id) : undefined,
  room: typeof row.name === "string" && row.name ? row.name : "Focus Room",
  minutes: typeof row.duration_minutes === "number" ? row.duration_minutes : 0,
  date:
    (typeof row.ended_at === "string" && row.ended_at) ||
    (typeof row.started_at === "string" && row.started_at) ||
    "",
});
