"use client";

import React, { useState, useRef, useEffect } from "react";
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
  SquarePen,
  Search,
  BookOpen,
  FolderKanban,
  Bell,
  Coins,
  Gem,
  Send,
  Flame,
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

const TOOL_ITEMS = [
  { label: "New chat", icon: SquarePen },
  { label: "Search chat", icon: Search },
  { label: "Materials", icon: BookOpen },
  { label: "Projects", icon: FolderKanban },
];

const RECENT_CHATS = [
  "Photosynthesis quiz prep",
  "Essay outline: river ecosystems",
  "English vocab drill",
];

const WASI_REPLIES = [
  "Good question — let's break it into three steps so it sticks.",
];

const ACCENT = "#2F80ED";
const ACCENT_SOFT = "#EAF2FE";

function AskWasi() {
  const [active, setActive] = useState("Ask Wasi");
  const [messages, setMessages] = useState([
    { sender: "Wasi", text: "Hey, MJ! What can I help you with?" },
  ]);
  const [draft, setDraft] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isTyping]);

  function handleSend() {
    const text = draft.trim();
    if (!text) return;
    setMessages((m) => [...m, { sender: "User", text }]);
    setDraft("");
    setIsTyping(true);
    setTimeout(() => {
      const reply = WASI_REPLIES[Math.floor(Math.random() * WASI_REPLIES.length)];
      setMessages((m) => [...m, { sender: "Wasi", text: reply }]);
      setIsTyping(false);
    }, 900);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
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
                    <span className="text-2x1 font-semibold" style={{ fontFamily: "'Lora', ui-serif, Georgia, serif", color: "#101825" }}>
                        12 days
                    </span>
                </div>
                <p className="text-[10.5px] leading-smug mt-2" style={{ color: "#6B7A90" }}>
                  Visit your companion and complete at least three quest everyday to keep the fire lit
                  </p>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="flex items-center justify between gap-4 px-7 py-4 border-b shrink-0" style={{ borderColor: "#E1E6EE" }}>
          <div>
            <h1 className="text-[22px] leading-tight font-semibold" style={{ fontFamily: "'Lora', ui-serif, Georgia, serif", color: "#101825" }}>
              Ask Wasi
            </h1>
            <p className="text-[12.5px]" style={{ color: "#6B7A90" }}>
              Your study companion, is ready when you are.
              </p>
          </div>

          <div className="flex items-center gap-2,5 shrink-0">
            <div className="hidden lg:flex items-center gap-2 rounded-full px-3.5 py2 w-64" style={{ background: "#FAFBFD", border: "1px solid #E1E6EE" }}>
              <Search size={14} color="9AA5B7" />
              <input
              placeholder="Search tasks, topic materials..."
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
        <div className="flex-1 flex min-h-0 p-6 gap-5">
          {/* Tools column */}
          <div className="w-[220px] shrink-0 flex flex-col gap-2">
            {TOOL_ITEMS.map(({ label, icon: Icon }) => (
              <button
                key={label}
                className="flex items-center gap-2.5 rounded-lg px-3.5 py-2.5 text-[13px] font-medium transition-colors"
                style={{ background: "#FAFBFD", border: "1px solid #E1E6EE", color: "#33415A" }}
              >
                <Icon size={15} strokeWidth={2} />
                {label}
              </button>
            ))}

            <div className="mt-4 px-1 text-[11.5px] font-semibold tracking-wide" style={{ color: "#9AA5B7" }}>
              Recent Chats
            </div>
            <div className="flex flex-col gap-1 mt-1">
              {RECENT_CHATS.map((chat) => (
                <button key={chat} className="text-left px-3 py-2 rounded-lg text-[12px] truncate transition-colors" style={{ color: "#5B6C86" }}>
                  {chat}
                </button>
              ))}
            </div>
          </div>

          {/* Chat panel */}
          <div className="flex-1 min-w-0 flex flex-col rounded-2xl overflow-hidden" style={{ background: "#FAFBFD", border: "1px solid #E1E6EE" }}>
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-6 flex flex-col gap-4">
              {messages.map((m, i) =>
                m.sender === "Wasi" ? (
                  <div key={i} className="flex items-start gap-2.5 max-w-[75%]">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-semibold shrink-0 mt-0.5" style={{ background: ACCENT, color: "#FAFBFD" }}>
                      W
                    </div>
                    <div className="rounded-2xl rounded-tl-sm px-4 py-2.5 text-[13.5px] leading-relaxed" style={{ background: "#EEF1F6", color: "#1B2430" }}>
                      {m.text}
                    </div>
                  </div>
                ) : (
                  <div key={i} className="flex justify-end">
                    <div className="rounded-2xl rounded-tr-sm px-4 py-2.5 text-[13.5px] leading-relaxed max-w-[75%]" style={{ background: ACCENT, color: "#FAFBFD" }}>
                      {m.text}
                    </div>
                  </div>
                )
              )}
              {isTyping && (
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-semibold shrink-0" style={{ background: ACCENT, color: "#FAFBFD" }}>
                    W
                  </div>
                  <div className="rounded-2xl rounded-tl-sm px-4 py-3" style={{ background: "#EEF1F6" }}>
                    <div className="flex gap-1">
                      {[0, 1, 2].map((d) => (
                        <span key={d} className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: "#9AA5B7", animationDelay: `${d * 0.12}s` }} />
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 px-5 py-4 border-t" style={{ borderColor: "#E1E6EE" }}>
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Start a conversation with Wasi..."
                className="flex-1 bg-transparent outline-none text-[13.5px] placeholder:text-[#9AA5B7]"
              />
              <button
                onClick={handleSend}
                className="flex items-center gap-1.5 rounded-full px-4 py-2 text-[13px] font-semibold transition-opacity"
                style={{ background: ACCENT, color: "#FAFBFD", opacity: draft.trim() ? 1 : 0.5 }}
                disabled={!draft.trim()}
              >
                Send
                <Send size={13} strokeWidth={2.25} />
              </button>
            </div>
          </div>
        </div>
      </div>
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

export default AskWasi;
            
     



