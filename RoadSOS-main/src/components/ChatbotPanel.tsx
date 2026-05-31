"use client";

import { useState, useEffect, useRef, FormEvent } from "react";

type ChatMessage = {
  id: string;
  sender: "bot" | "user";
  text: string;
  emergency?: boolean;
};

const initialMessages: ChatMessage[] = [
  {
    id: "welcome",
    sender: "bot",
    text: "Ask me about road safety, transportation, healthcare, or immediate first aid.",
  },
];

function TypingIndicator({ isEmergency }: { isEmergency: boolean }) {
  return (
    <article className="flex gap-2.5 items-end">
      <span className={`rca-avatar ${isEmergency ? "rca-avatar--em" : ""}`}>R</span>
      <div className={`rca-bubble rca-bubble--bot ${isEmergency ? "rca-bubble--em" : ""}`}>
        <span className="rca-dot" style={{ animationDelay: "0ms" }} />
        <span className="rca-dot" style={{ animationDelay: "150ms" }} />
        <span className="rca-dot" style={{ animationDelay: "300ms" }} />
      </div>
    </article>
  );
}

function QuickChip({
  label,
  isEmergency,
  onClick,
}: {
  label: string;
  isEmergency: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`rca-chip ${isEmergency ? "rca-chip--em" : ""}`}
    >
      {label}
    </button>
  );
}

export default function ChatbotPanel() {
  const [isAvailable, setIsAvailable] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [prompt, setPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isEmergency, setIsEmergency] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const quickChips = isEmergency
    ? ["CPR steps", "Share location", "Call 112"]
    : ["Road safety tips", "Accident protocol", "Emergency contacts"];

  useEffect(() => {
    async function checkStatus() {
      try {
        const res = await fetch("/api/chat/status");
        if (res.ok) {
          const data = await res.json();
          if (data.available) setIsAvailable(true);
        }
      } catch {
        // Not available
      }
    }
    checkStatus();
  }, []);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isLoading, isOpen]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      sender: "user",
      text: trimmedPrompt,
    };

    setMessages((current) => [...current, userMessage]);
    setPrompt("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmedPrompt }),
      });

      const data = await response.json();

      setIsEmergency((current) => current || Boolean(data.emergency));
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          sender: "bot",
          text: data.reply,
          emergency: Boolean(data.emergency),
        },
      ]);
    } catch {
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          sender: "bot",
          text: "The chatbot server is not responding. Please try again.",
        },
      ]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  }

  function handleChipClick(label: string) {
    setPrompt(label);
    inputRef.current?.focus();
  }

  if (!isAvailable) return null;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap');

        :root {
          --mid-bg:        #08090f;
          --mid-surface:   #0f1017;
          --mid-surface2:  #14151f;
          --mid-border:    rgba(255,255,255,0.07);
          --mid-border2:   rgba(255,255,255,0.12);
          --mid-text:      rgba(255,255,255,0.90);
          --mid-muted:     rgba(255,255,255,0.42);
          --mid-hint:      rgba(255,255,255,0.20);
          --mid-accent:    #7c6dfa;
          --mid-accent2:   #9d91fb;
          --mid-cyan:      #22d3ee;
          --mid-em:        #ff4545;
          --mid-em-bg:     rgba(255,69,69,0.10);
          --mid-em-border: rgba(255,69,69,0.28);
          --mid-em-text:   #ff7070;
          --mid-success:   #34d399;
          --mid-font:      'Plus Jakarta Sans', sans-serif;
          --mid-mono:      'DM Mono', monospace;
          --mid-blur:      blur(20px) saturate(160%);
          --mid-radius:    18px;
          --mid-shadow:    0 24px 64px rgba(0,0,0,0.6), 0 4px 16px rgba(0,0,0,0.4);
        }

        /* ── FAB ── */
        .rca-fab {
          position: fixed;
          bottom: 24px; right: 24px;
          z-index: 2000;
          width: 52px; height: 52px;
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          background: var(--mid-surface2);
          border: 1px solid var(--mid-border2);
          color: var(--mid-text);
          cursor: pointer;
          transition: transform 0.2s, opacity 0.2s, box-shadow 0.2s;
          box-shadow: 0 4px 24px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04) inset;
          font-family: var(--mid-font);
          overflow: hidden;
        }
        .rca-fab::before {
          content: '';
          position: absolute; inset: 0; border-radius: 50%;
          background: linear-gradient(135deg, rgba(124,109,250,0.15), transparent 60%);
        }
        .rca-fab:hover { transform: scale(1.06); box-shadow: 0 8px 32px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.06) inset; }
        .rca-fab:active { transform: scale(0.94); }
        .rca-fab--em { background: var(--mid-em-bg); border-color: var(--mid-em-border); color: var(--mid-em-text); }
        .rca-fab--open { transform: scale(0.88); opacity: 0; pointer-events: none; }

        /* ── WINDOW ── */
        .rca-window {
          position: fixed;
          bottom: 24px; right: 24px;
          z-index: 2000;
          width: min(calc(100vw - 32px), 376px);
          height: min(calc(100vh - 100px), 540px);
          display: flex; flex-direction: column;
          border-radius: var(--mid-radius);
          overflow: hidden;
          border: 1px solid var(--mid-border2);
          background: var(--mid-bg);
          box-shadow: var(--mid-shadow);
          font-family: var(--mid-font);
          transform-origin: bottom right;
          transition: transform 0.22s cubic-bezier(0.16,1,0.3,1), opacity 0.18s;
        }
        .rca-window--open { transform: scale(1); opacity: 1; }
        .rca-window--closed { transform: scale(0.92); opacity: 0; pointer-events: none; }
        .rca-window--em { border-color: var(--mid-em-border); }

        /* top accent line */
        .rca-window::before {
          content: '';
          position: absolute; top: 0; left: 0; right: 0; height: 1px;
          background: linear-gradient(90deg, transparent, var(--mid-accent), rgba(34,211,238,0.5), transparent);
          z-index: 1;
        }
        .rca-window--em::before {
          background: linear-gradient(90deg, transparent, var(--mid-em), transparent);
        }

        /* emergency stripe */
        .rca-em-stripe {
          height: 3px; flex-shrink: 0;
          background: linear-gradient(90deg, var(--mid-em), #ff6b6b, var(--mid-em));
          animation: rca-stripe-move 2.4s linear infinite;
          background-size: 200% 100%;
        }
        @keyframes rca-stripe-move {
          0% { background-position: 0% 0%; }
          100% { background-position: 200% 0%; }
        }

        /* ── HEADER ── */
        .rca-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 12px 14px;
          border-bottom: 1px solid var(--mid-border);
          background: var(--mid-surface);
          flex-shrink: 0;
          position: relative;
        }
        .rca-header-left { display: flex; align-items: center; gap: 10px; }
        .rca-avatar-wrap { position: relative; }
        .rca-avatar {
          width: 34px; height: 34px; border-radius: 10px;
          background: rgba(124,109,250,0.12);
          border: 1px solid rgba(124,109,250,0.28);
          display: flex; align-items: center; justify-content: center;
          font-size: 12px; font-weight: 700; letter-spacing: 0.04em;
          color: var(--mid-accent2);
          font-family: var(--mid-mono);
          flex-shrink: 0;
        }
        .rca-avatar--em {
          background: var(--mid-em-bg);
          border-color: var(--mid-em-border);
          color: var(--mid-em-text);
        }
        .rca-avatar-sm {
          width: 28px; height: 28px; border-radius: 8px;
          font-size: 10px;
        }
        .rca-status-dot {
          position: absolute; bottom: -2px; right: -2px;
          width: 8px; height: 8px; border-radius: 50%;
          background: var(--mid-success);
          border: 2px solid var(--mid-surface);
          animation: rca-pulse 2.4s ease-in-out infinite;
        }
        .rca-status-dot--em { background: var(--mid-em); }
        @keyframes rca-pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }

        .rca-name {
          font-size: 13px; font-weight: 700;
          color: var(--mid-text); line-height: 1.2;
          letter-spacing: -0.01em;
        }
        .rca-subtitle {
          font-size: 10px; color: var(--mid-muted);
          margin-top: 1px; line-height: 1;
          letter-spacing: 0.04em; text-transform: uppercase;
          font-family: var(--mid-mono);
        }
        .rca-subtitle--em { color: var(--mid-em-text); }

        .rca-header-right { display: flex; align-items: center; gap: 6px; }
        .rca-live-badge {
          font-size: 9px; font-weight: 700; letter-spacing: 0.08em;
          text-transform: uppercase; font-family: var(--mid-mono);
          padding: 3px 7px; border-radius: 4px;
          background: var(--mid-em-bg); border: 1px solid var(--mid-em-border);
          color: var(--mid-em-text);
        }
        .rca-icon-btn {
          width: 30px; height: 30px; border-radius: 8px;
          display: flex; align-items: center; justify-content: center;
          background: transparent; border: 1px solid transparent;
          color: var(--mid-hint); cursor: pointer;
          transition: background 0.15s, color 0.15s, border-color 0.15s;
        }
        .rca-icon-btn:hover {
          background: var(--mid-surface2); border-color: var(--mid-border);
          color: var(--mid-text);
        }

        /* ── MESSAGES ── */
        .rca-msgs {
          flex: 1; overflow-y: auto; padding: 16px 14px;
          display: flex; flex-direction: column; gap: 12px;
          scrollbar-width: none;
        }
        .rca-msgs::-webkit-scrollbar { display: none; }

        .rca-msg { display: flex; align-items: flex-end; gap: 8px; }
        .rca-msg--user { flex-direction: row-reverse; }

        .rca-bubble {
          max-width: 78%; font-size: 13px; line-height: 1.55;
          padding: 9px 13px; border-radius: 14px;
          word-break: break-word;
          border: 1px solid var(--mid-border);
        }
        .rca-bubble--bot {
          background: var(--mid-surface2);
          border-color: var(--mid-border);
          color: var(--mid-text);
          border-bottom-left-radius: 4px;
          display: flex; align-items: center; gap: 5px;
        }
        .rca-bubble--user {
          background: rgba(124,109,250,0.10);
          border-color: rgba(124,109,250,0.20);
          color: var(--mid-text);
          border-bottom-right-radius: 4px;
        }
        .rca-bubble--em {
          background: var(--mid-em-bg);
          border-color: var(--mid-em-border);
          color: var(--mid-em-text);
        }

        /* typing dots */
        .rca-dot {
          width: 5px; height: 5px; border-radius: 50%;
          background: var(--mid-muted);
          display: inline-block;
          animation: rca-bounce 1.1s ease-in-out infinite;
        }
        @keyframes rca-bounce {
          0%,80%,100% { transform: translateY(0); opacity: 0.5; }
          40% { transform: translateY(-5px); opacity: 1; }
        }

        /* scroll fade */
        .rca-fade {
          pointer-events: none; flex-shrink: 0;
          height: 24px; margin-top: -24px;
          background: linear-gradient(to bottom, transparent, var(--mid-bg));
        }

        /* ── CHIPS ── */
        .rca-chips {
          display: flex; flex-wrap: wrap; gap: 6px;
          padding: 0 14px 10px;
          flex-shrink: 0;
        }
        .rca-chip {
          font-size: 11px; font-weight: 500; font-family: var(--mid-font);
          padding: 5px 11px; border-radius: 50px;
          border: 1px solid var(--mid-border2);
          background: var(--mid-surface2);
          color: var(--mid-muted);
          cursor: pointer; white-space: nowrap;
          transition: background 0.15s, color 0.15s, border-color 0.15s;
        }
        .rca-chip:hover {
          background: var(--mid-surface);
          color: var(--mid-text);
          border-color: var(--mid-border2);
        }
        .rca-chip--em {
          background: var(--mid-em-bg);
          border-color: var(--mid-em-border);
          color: var(--mid-em-text);
        }
        .rca-chip--em:hover { opacity: 0.82; }

        /* ── INPUT ── */
        .rca-input-wrap {
          flex-shrink: 0;
          border-top: 1px solid var(--mid-border);
          padding: 10px 12px;
          background: var(--mid-surface);
        }
        .rca-input-row {
          display: flex; align-items: center; gap: 8px;
          background: var(--mid-surface2);
          border: 1px solid var(--mid-border2);
          border-radius: 12px;
          padding: 0 10px;
          transition: border-color 0.15s;
        }
        .rca-input-row:focus-within {
          border-color: rgba(124,109,250,0.40);
          box-shadow: 0 0 0 3px rgba(124,109,250,0.08);
        }
        .rca-input-row--em:focus-within {
          border-color: var(--mid-em-border);
          box-shadow: 0 0 0 3px rgba(255,69,69,0.08);
        }
        .rca-attach-btn {
          background: none; border: none;
          color: var(--mid-hint); cursor: pointer;
          display: flex; align-items: center;
          padding: 0; transition: color 0.15s; flex-shrink: 0;
        }
        .rca-attach-btn:hover { color: var(--mid-muted); }
        .rca-input {
          flex: 1; background: transparent; border: none; outline: none;
          font-size: 13px; font-family: var(--mid-font);
          color: var(--mid-text); padding: 11px 0;
        }
        .rca-input::placeholder { color: var(--mid-hint); }
        .rca-send-btn {
          width: 28px; height: 28px; flex-shrink: 0; border-radius: 8px;
          display: flex; align-items: center; justify-content: center;
          border: 1px solid var(--mid-border2);
          background: rgba(124,109,250,0.12);
          color: var(--mid-accent2); cursor: pointer;
          transition: background 0.15s, opacity 0.15s, transform 0.1s;
        }
        .rca-send-btn:hover:not(:disabled) {
          background: rgba(124,109,250,0.22);
        }
        .rca-send-btn:active:not(:disabled) { transform: scale(0.92); }
        .rca-send-btn:disabled { opacity: 0.25; cursor: not-allowed; }
        .rca-send-btn--em {
          background: var(--mid-em-bg); border-color: var(--mid-em-border);
          color: var(--mid-em-text);
        }
        .rca-send-btn--em:hover:not(:disabled) { background: rgba(255,69,69,0.18); }

        /* ── FOOTER ── */
        .rca-footer {
          flex-shrink: 0;
          display: flex; align-items: center; justify-content: center; gap: 5px;
          border-top: 1px solid var(--mid-border);
          padding: 7px 14px;
          font-size: 10px; font-family: var(--mid-mono); letter-spacing: 0.03em;
          color: var(--mid-hint);
          background: var(--mid-surface);
        }
      `}</style>

      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`rca-fab ${isEmergency ? "rca-fab--em" : ""} ${isOpen ? "rca-fab--open" : ""}`}
        aria-label="Open RoadAid Chat"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"
          fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      </button>

      <div className={`rca-window ${isOpen ? "rca-window--open" : "rca-window--closed"} ${isEmergency ? "rca-window--em" : ""}`}>

        {isEmergency && <div className="rca-em-stripe" />}

        <div className="rca-header">
          <div className="rca-header-left">
            <div className="rca-avatar-wrap">
              <div className={`rca-avatar ${isEmergency ? "rca-avatar--em" : ""}`}>R</div>
              <div className={`rca-status-dot ${isEmergency ? "rca-status-dot--em" : ""}`} />
            </div>
            <div>
              <div className="rca-name">RoadAid AI</div>
              <div className={`rca-subtitle ${isEmergency ? "rca-subtitle--em" : ""}`}>
                {isEmergency ? "Emergency Mode" : "Safety Assistant"}
              </div>
            </div>
          </div>
          <div className="rca-header-right">
            {isEmergency && <span className="rca-live-badge">Live</span>}
            <button onClick={() => setIsOpen(false)} className="rca-icon-btn" aria-label="Close">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
                fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        <div className="rca-msgs">
          {messages.map((message) => (
            <article key={message.id} className={`rca-msg ${message.sender === "user" ? "rca-msg--user" : ""}`}>
              <div className={`rca-avatar rca-avatar-sm ${message.sender === "bot" && isEmergency ? "rca-avatar--em" : ""}`}>
                {message.sender === "bot" ? "R" : "U"}
              </div>
              <div className={[
                "rca-bubble",
                message.sender === "user"
                  ? "rca-bubble--user"
                  : message.emergency || isEmergency
                  ? "rca-bubble--em rca-bubble--bot"
                  : "rca-bubble--bot",
              ].join(" ")}>
                {message.text}
              </div>
            </article>
          ))}
          {isLoading && <TypingIndicator isEmergency={isEmergency} />}
          <div ref={messagesEndRef} style={{ height: 4 }} />
        </div>

        <div className="rca-fade" />

        <div className="rca-chips">
          {quickChips.map((chip) => (
            <QuickChip key={chip} label={chip} isEmergency={isEmergency} onClick={() => handleChipClick(chip)} />
          ))}
        </div>

        <div className="rca-input-wrap">
          <form onSubmit={handleSubmit}>
            <div className={`rca-input-row ${isEmergency ? "rca-input-row--em" : ""}`}>
              <button type="button" className="rca-attach-btn" aria-label="Attach">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                </svg>
              </button>
              <input
                ref={inputRef}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                disabled={isLoading}
                className="rca-input"
                type="text"
                placeholder={isEmergency ? "Describe the emergency…" : "Ask RoadAid…"}
                autoComplete="off"
              />
              <button
                type="submit"
                disabled={isLoading || !prompt.trim()}
                className={`rca-send-btn ${isEmergency ? "rca-send-btn--em" : ""}`}
                aria-label="Send"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24"
                  fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </button>
            </div>
          </form>
        </div>

        <div className="rca-footer">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          {isEmergency ? "Priority emergency channel" : "End-to-end encrypted"}
        </div>
      </div>
    </>
  );
}
