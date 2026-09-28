"use client";

import React, { useState } from "react";
import {
  Home,
  MessageCircle,
  Film,
  CalendarDays,
  Timer,
  Sprout,
  Gift,
  Map,
  Settings,
  Search,
  Bell,
  Coins,
  Gem,
  Flame,
  Copy,
  UserPlus,
  ChevronDown,
} from "lucide-react";

const NAV_ITEMS = [
  { label: "Home", icon: Home },
  { label: "Ask Wasi", icon: MessageCircle },
  { label: "Study Reels", icon: Film },
  { label: "Quest Calendar", icon: CalendarDays },
  { label: "Focus Room", icon: Timer },
  { label: "Pet Garden", icon: Sprout },
  { label: "Reward Shop", icon: Gift },
  { label: "Progress Map", icon: Map },
  { label: "Settings", icon: Settings },
];

const DURATIONS = ["15m", "30m", "45m", "60m", "Custom"];

const PARTICIPANTS = [
  { name: "MJ", status: "In Lobby" },
  { name: "Denise", status: "In Lobby" },
  { name: "Ethan", status: "In Lobby" },
];

const FRIENDS_ONLINE = [
  { name: "Denise", status: "In Lobby" },
  { name: "Ethan", status: "In Lobby" },
  { name: "Jenny", status: "Online" },
];

const HISTORY_ROWS = [
  { room: "", time: "", date: "" },
  { room: "", time: "", date: "" },
  { room: "", time: "", date: "" },
];

const ACCENT = "#2F80ED";
const ACCENT_SOFT = "#EAF2FE";

function FocusRoom() {
  const [active, setActive] = useState("Focus Room");
  const [roomName, setRoomName] = useState("Midterm Review Room");
  const [studyGoal, setStudyGoal] = useState("Review Data Structures");
  const [duration, setDuration] = useState("30m");
  const [linkedTask, setLinkedTask] = useState("Binary Search Practice");
  const [copied, setCopied] = useState(false);

  function handleCopyInvite() {
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div
      className="w-full h-full min-h-[700px] flex"
      style={{
        background: "#F3F5F9",
        fontFamily: "'Inter', ui-sans-serif, system-ui, -apple-system, sans-serif",
        color: "#1B2430",
      }}
    >
      {/* Sidebar */}
      <aside
        className="w-[240px] shrink-0 flex flex-col justify-between p-5 border-r"
        style={{ borderColor: "#E1E6EE", background: "#FAFBFD" }}
      >
        <div>
          <div className="flex items-center gap-2.5 mb-8 px-1">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: ACCENT }}
            >
              <Sprout size={17} color="#FAFBFD" strokeWidth={2.25} />
            </div>
            <span
              className="text-[15px] font-semibold tracking-tight"
              style={{ fontFamily: "'Lora', ui-serif, Georgia, serif", color: "#101825" }}
            >
              CommonGrounds
            </span>
          </div>

          <nav className="flex flex-col gap-0.5">
            {NAV_ITEMS.map(({ label, icon: Icon }) => {
              const isActive = active === label;
              return (
                <button
                  key={label}
                  onClick={() => setActive(label)}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg text-[13.5px] text-left transition-colors"
                  style={{
                    background: isActive ? ACCENT : "transparent",
                    color: isActive ? "#FAFBFD" : "#4B5768",
                    fontWeight: isActive ? 600 : 500,
                  }}
                >
                  <Icon size={16} strokeWidth={2} />
                  {label}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="rounded-xl p-4 text-center" style={{ background: ACCENT_SOFT }}>
          <div className="flex items-center justify-center gap-1.5 text-[11.5px] font-medium mb-1" style={{ color: "#5B6C86" }}>
            Today's Streak
          </div>
          <div className="flex items-center justify-center gap-1.5">
            <Flame size={20} color="#C98A2C" strokeWidth={2.25} fill="#C98A2C" fillOpacity={0.25} />
            <span className="text-2xl font-semibold" style={{ fontFamily: "'Lora', ui-serif, Georgia, serif", color: "#101825" }}>
              12 days
            </span>
          </div>
          <p className="text-[10.5px] leading-snug mt-2" style={{ color: "#6B7A90" }}>
            Visit your companion and complete at least three quests every day to keep the fire lit.
          </p>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="flex items-center justify-between gap-4 px-7 py-4 border-b shrink-0" style={{ borderColor: "#E1E6EE" }}>
          <div>
            <h1 className="text-[22px] leading-tight font-semibold" style={{ fontFamily: "'Lora', ui-serif, Georgia, serif", color: "#101825" }}>
              Focus Room
            </h1>
            <p className="text-[12.5px]" style={{ color: "#6B7A90" }}>
              Set a sprint, invite your crew, and lock in.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <div className="hidden lg:flex items-center gap-2 rounded-full px-3.5 py-2 w-64" style={{ background: "#FAFBFD", border: "1px solid #E1E6EE" }}>
              <Search size={14} color="#9AA5B7" />
              <input
                placeholder="Search tasks, topics, materials..."
                className="bg-transparent outline-none text-[12.5px] w-full placeholder:text-[#9AA5B7]"
              />
            </div>
            <Pill icon={<Coins size={13} color="#C98A2C" />} value="2,450" />
            <Pill icon={<Gem size={13} color="#6B5CA5" />} value="150" />
            <Pill icon={<Bell size={13} color={ACCENT} />} value="3" />
            <div className="flex items-center gap-1.5 rounded-full pl-1 pr-3 py-1" style={{ background: ACCENT }}>
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10.5px] font-semibold" style={{ background: "#FAFBFD", color: ACCENT }}>
                MJ
              </div>
              <span className="text-[12px] font-medium" style={{ color: "#FAFBFD" }}>
                Lvl 8
              </span>
            </div>
          </div>
        </header>

        {/* Body */}
        <div className="flex-1 min-h-0 overflow-y-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5">
            {/* Left column */}
            <div className="flex flex-col gap-5 min-w-0">
              {/* Room Setup */}
              <div className="rounded-2xl p-6" style={{ background: "#FAFBFD", border: "1px solid #E1E6EE" }}>
                <h2 className="text-[17px] font-semibold mb-4" style={{ fontFamily: "'Lora', ui-serif, Georgia, serif", color: "#101825" }}>
                  Room Setup
                </h2>

                <div className="flex flex-col gap-4">
                  <Field label="Room Name">
                    <input
                      value={roomName}
                      onChange={(e) => setRoomName(e.target.value)}
                      className="w-full rounded-lg px-3.5 py-2.5 text-[13.5px] outline-none"
                      style={{ background: "#F3F5F9", border: "1px solid #E1E6EE", color: "#1B2430" }}
                    />
                  </Field>

                  <Field label="Study Goal">
                    <input
                      value={studyGoal}
                      onChange={(e) => setStudyGoal(e.target.value)}
                      className="w-full rounded-lg px-3.5 py-2.5 text-[13.5px] outline-none"
                      style={{ background: "#F3F5F9", border: "1px solid #E1E6EE", color: "#1B2430" }}
                    />
                  </Field>

                  <Field label="Duration">
                    <div className="flex flex-wrap gap-2">
                      {DURATIONS.map((d) => {
                        const isSelected = duration === d;
                        return (
                          <button
                            key={d}
                            onClick={() => setDuration(d)}
                            className="px-4 py-2 rounded-full text-[12.5px] font-medium transition-colors"
                            style={{
                              background: isSelected ? ACCENT : "#F3F5F9",
                              color: isSelected ? "#FAFBFD" : "#4B5768",
                              border: `1px solid ${isSelected ? ACCENT : "#E1E6EE"}`,
                            }}
                          >
                            {d}
                          </button>
                        );
                      })}
                    </div>
                  </Field>

                  <Field label="Linked Task">
                    <div className="relative">
                      <select
                        value={linkedTask}
                        onChange={(e) => setLinkedTask(e.target.value)}
                        className="w-full appearance-none rounded-lg px-3.5 py-2.5 text-[13.5px] outline-none"
                        style={{ background: "#F3F5F9", border: "1px solid #E1E6EE", color: "#1B2430" }}
                      >
                        <option>Binary Search Practice</option>
                        <option>Essay Outline Draft</option>
                        <option>Spanish Vocab Drill</option>
                      </select>
                      <ChevronDown size={15} color="#9AA5B7" className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </Field>

                  <button
                    className="w-full rounded-xl py-3 text-[13.5px] font-semibold mt-1"
                    style={{ background: ACCENT, color: "#FAFBFD" }}
                  >
                    Start Focus Room
                  </button>
                </div>
              </div>

              {/* Focus Room History */}
              <div className="rounded-2xl p-6" style={{ background: "#FAFBFD", border: "1px solid #E1E6EE" }}>
                <h2 className="text-[17px] font-semibold mb-4" style={{ fontFamily: "'Lora', ui-serif, Georgia, serif", color: "#101825" }}>
                  Focus Room History
                </h2>

                <div className="grid grid-cols-[1fr_100px_100px] gap-3 text-[11px] font-semibold tracking-wide mb-2" style={{ color: "#9AA5B7" }}>
                  <span>Room Histories</span>
                  <span>Sprint Time</span>
                  <span>Date</span>
                </div>

                <div className="flex flex-col gap-2">
                  {HISTORY_ROWS.map((row, i) => (
                    <div key={i} className="grid grid-cols-[1fr_100px_100px] gap-3">
                      <div className="rounded-lg h-9" style={{ background: "#F3F5F9", border: "1px solid #E1E6EE" }} />
                      <div className="rounded-lg h-9" style={{ background: "#F3F5F9", border: "1px solid #E1E6EE" }} />
                      <div className="rounded-lg h-9" style={{ background: "#F3F5F9", border: "1px solid #E1E6EE" }} />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right column */}
            <div className="flex flex-col gap-5">
              {/* Participants */}
              <div className="rounded-2xl p-5" style={{ background: "#FAFBFD", border: "1px solid #E1E6EE" }}>
                <h3 className="text-[15px] font-semibold mb-1" style={{ fontFamily: "'Lora', ui-serif, Georgia, serif", color: "#101825" }}>
                  Participants in the Lobby
                </h3>
                <p className="text-[11.5px] mb-3" style={{ color: "#9AA5B7" }}>
                  {PARTICIPANTS.length}/7 Members
                </p>
                <div className="flex flex-col gap-2">
                  {PARTICIPANTS.map((p) => (
                    <div
                      key={p.name}
                      className="flex items-center justify-between rounded-lg px-3.5 py-2.5 text-[13px]"
                      style={{ background: p.name === "MJ" ? ACCENT : "#F3F5F9", color: p.name === "MJ" ? "#FAFBFD" : "#33415A" }}
                    >
                      <span className="font-medium">{p.name}</span>
                      <span className="text-[11px]" style={{ opacity: 0.8 }}>{p.status}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Friends Online */}
              <div className="rounded-2xl p-5" style={{ background: "#FAFBFD", border: "1px solid #E1E6EE" }}>
                <h3 className="text-[15px] font-semibold mb-3" style={{ fontFamily: "'Lora', ui-serif, Georgia, serif", color: "#101825" }}>
                  Friends Online
                </h3>
                <div className="flex flex-col gap-2.5 mb-4">
                  {FRIENDS_ONLINE.map((f) => (
                    <div key={f.name} className="flex items-center gap-2.5 text-[13px]">
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ background: f.status === "Online" ? "#3FB56A" : "#C7CEDA" }}
                      />
                      <span className="font-medium" style={{ color: "#33415A" }}>{f.name}</span>
                      <span className="text-[11.5px]" style={{ color: "#9AA5B7" }}>· {f.status}</span>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleCopyInvite}
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-[12px] font-semibold"
                    style={{ background: "#101825", color: "#FAFBFD" }}
                  >
                    <Copy size={12} strokeWidth={2.25} />
                    {copied ? "Copied!" : "Copy Invite Code"}
                  </button>
                  <button
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-[12px] font-semibold"
                    style={{ background: "#F3F5F9", color: "#33415A", border: "1px solid #E1E6EE" }}
                  >
                    <UserPlus size={12} strokeWidth={2.25} />
                    Invite Friends
                  </button>
                </div>
              </div>

              {/* Rewards Preview */}
              <div className="rounded-2xl p-5" style={{ background: ACCENT_SOFT }}>
                <h3 className="text-[15px] font-semibold mb-1" style={{ fontFamily: "'Lora', ui-serif, Georgia, serif", color: "#101825" }}>
                  Rewards Preview
                </h3>
                <p className="text-[11.5px] mb-2.5" style={{ color: "#5B6C86" }}>
                  Complete 30 minutes focus sprint to earn:
                </p>
                <ul className="flex flex-col gap-1 text-[12.5px]" style={{ color: "#33415A" }}>
                  <li>+30 Student Coins</li>
                  <li>+20 Pet Energy</li>
                  <li>+12 Steak EXP</li>
                </ul>
                <p className="text-[11px] mt-2.5" style={{ color: "#6B7A90" }}>
                  Additional rewards if finished in a group
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[12px] font-medium mb-1.5" style={{ color: "#5B6C86" }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function Pill({ icon, value }: { icon: React.ReactNode; value: string }) {
  return (
    <div className="flex items-center gap-1.5 rounded-full px-3 py-1.5" style={{ background: "#FAFBFD", border: "1px solid #E1E6EE" }}>
      {icon}
      <span className="text-[12px] font-medium" style={{ color: "#33415A" }}>
        {value}
      </span>
    </div>
  );
}

export default FocusRoom;