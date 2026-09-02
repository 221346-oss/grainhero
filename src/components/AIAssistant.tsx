"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { 
  Send, Loader2, RefreshCw, Minimize2, ChevronDown, 
  User, Sprout, Thermometer, AlertTriangle, BarChart2, Lightbulb 
} from "lucide-react";
import { toast } from "sonner";
import { ErrorBoundary } from "react-error-boundary";

/* ─────────────────────────────────────────────────────────────────────────
   TYPES
───────────────────────────────────────────────────────────────────────── */
interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const ML_SERVICE_URL =
  (import.meta.env.VITE_ML_SERVICE_URL as string) ?? "http://localhost:8001";

const QUICK_REPLIES = [
  { text: "Check silo temperature", icon: <Thermometer size={13} /> },
  { text: "Recent alerts", icon: <AlertTriangle size={13} /> },
  { text: "Grain risk analysis", icon: <BarChart2 size={13} /> },
  { text: "Storage best practices", icon: <Lightbulb size={13} /> },
];

const INIT_MSG: Message = {
  id: "init",
  role: "assistant",
  content:
    "Hello! I am GrainHero AI. I have access to your live sensor data and grain science research. How can I help you today?",
  timestamp: new Date(),
};

/* ─────────────────────────────────────────────────────────────────────────
   CSS  (injected once as a <style> tag)
───────────────────────────────────────────────────────────────────────── */
const ALL_CSS = `
  /* ── Floating chat window ──────────────────────────────────────────── */
  @keyframes gh-chat-in {
    from { opacity:0; transform: translateY(24px) scale(0.94); }
    to   { opacity:1; transform: translateY(0)    scale(1);    }
  }
  @keyframes gh-chat-out {
    from { opacity:1; transform: translateY(0)    scale(1);    }
    to   { opacity:0; transform: translateY(24px) scale(0.94); }
  }
  @keyframes gh-dot {
    0%,80%,100% { transform: scale(0); }
    40%         { transform: scale(1); }
  }
  @keyframes gh-msg-in {
    from { opacity:0; transform: translateY(10px); }
    to   { opacity:1; transform: translateY(0);    }
  }
  @keyframes gh-pulse-dot {
    0%,100% { opacity:1; }
    50%     { opacity:0.35; }
  }

  .gh-window {
    position: fixed;
    top: 72px;
    bottom: 15px;
    right: 20px;
    width: 380px;
    background: #EDE9D4;
    border-radius: 22px;
    box-shadow:
      0 24px 64px rgba(37, 45, 38, 0.25),
      0 6px 20px rgba(37, 45, 38, 0.15),
      0 0 0 1px rgba(37, 45, 38, 0.1);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    z-index: 9999;
    animation: gh-chat-in 0.35s cubic-bezier(0.34,1.56,0.64,1) forwards;
  }
  .gh-window.closing {
    animation: gh-chat-out 0.22s ease-in forwards;
  }
  .gh-window.minimized {
    max-height: 68px;
    overflow: hidden;
  }

  /* Header */
  .gh-header {
    background: rgba(47, 172, 12, 0.9);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    padding: 6px 10px 6px 12px;
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
    cursor: default;
    user-select: none;
  }
  .gh-avatar {
    width: 24px; height: 24px;
    border-radius: 50%;
    background: #252D26;
    border: 2px solid #EDE9D4;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
  }
  .gh-header-info { flex: 1; min-width: 0; }
  .gh-header-name {
    color: #EDE9D4;
    font-size: 12.5px;
    font-weight: 700;
    font-family: 'Inter', system-ui, sans-serif;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .gh-header-actions {
    display: flex; align-items: center; gap: 0px;
  }
  .gh-icon-btn {
    width: 28px; height: 28px;
    border-radius: 50%;
    border: none;
    background: transparent;
    color: #EDE9D4;
    cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    transition: background 0.15s, transform 0.1s;
    flex-shrink: 0;
  }
  .gh-icon-btn:hover {
    background: rgba(237, 233, 212, 0.2);
    transform: scale(1.08);
  }
  .gh-icon-btn:active { transform: scale(0.95); }
  .gh-icon-btn.close:hover { background: rgba(37, 45, 38, 0.4); }

  /* Messages area */
  .gh-messages {
    flex: 1;
    overflow-y: auto;
    padding: 8px 14px 12px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    scroll-behavior: smooth;
    background: #EDE9D4;
  }
  .gh-messages::-webkit-scrollbar { width: 5px; }
  .gh-messages::-webkit-scrollbar-thumb { background: rgba(37, 45, 38, 0.2); border-radius: 4px; }

  /* Message row */
  .gh-msg-row {
    display: flex;
    gap: 8px;
    align-items: flex-end;
    animation: gh-msg-in 0.25s ease-out forwards;
  }
  .gh-msg-row.user { 
    justify-content: flex-end; 
  }

  .gh-msg-avatar {
    width: 28px; height: 28px;
    border-radius: 50%;
    background: #252D26;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
    border: 1.5px solid #2FAC0C;
    color: #EDE9D4;
  }

  .gh-bubble {
    max-width: 78%;
    width: fit-content;
    padding: 7px 10px;
    border-radius: 16px;
    font-size: 12.5px;
    line-height: 1.35;
    font-family: 'Inter', system-ui, sans-serif;
    word-break: break-word;
    position: relative;
  }
  .gh-bubble.bot {
    background: #ffffff;
    color: #252D26;
    border-radius: 16px 16px 16px 4px;
    box-shadow: 0 1px 4px rgba(37, 45, 38, 0.1);
    border: 1px solid rgba(37, 45, 38, 0.05);
  }
  .gh-bubble.user {
    background: #2FAC0C;
    color: #EDE9D4;
    border-radius: 16px 16px 4px 16px;
    box-shadow: 0 2px 6px rgba(47, 172, 12, 0.2);
  }
  .gh-msg-time {
    font-size: 10px;
    color: #252D26;
    opacity: 0.5;
    margin-top: 3px;
    padding: 0 4px;
    font-family: 'Inter', system-ui, sans-serif;
  }
  .gh-msg-row.user .gh-msg-time { text-align: right; }

  .gh-msg-meta {
    display: flex;
    flex-direction: column;
    gap: 2px;
    max-width: 82%;
  }
  .gh-msg-row.user .gh-msg-meta { align-items: flex-end; }

  /* Quick replies */
  .gh-quick-replies {
    display: flex;
    flex-wrap: wrap;
    gap: 7px;
    padding: 6px 14px 10px 48px;
  }
  .gh-qr-btn {
    background: #ffffff;
    border: 1.5px solid #2FAC0C;
    color: #252D26;
    font-size: 11.5px;
    font-family: 'Inter', system-ui, sans-serif;
    font-weight: 500;
    padding: 6px 12px;
    border-radius: 20px;
    cursor: pointer;
    transition: all 0.15s;
    display: flex;
    align-items: center;
    gap: 5px;
  }
  .gh-qr-btn:hover {
    background: #2FAC0C;
    color: #EDE9D4;
    transform: translateY(-1px);
  }
  .gh-qr-btn:active { transform: scale(0.97); }

  /* Typing indicator */
  .gh-typing {
    display: flex; align-items: center; gap: 8px;
    padding: 2px 14px 8px;
  }
  .gh-typing-avatar {
    width: 28px; height: 28px;
    border-radius: 50%;
    background: #252D26;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
    border: 1.5px solid #2FAC0C;
    color: #EDE9D4;
  }
  .gh-typing-bubble {
    background: #ffffff;
    border: 1px solid rgba(37, 45, 38, 0.05);
    border-radius: 16px 16px 16px 4px;
    box-shadow: 0 1px 4px rgba(37, 45, 38, 0.1);
    padding: 10px 14px;
    display: flex; gap: 5px; align-items: center;
  }
  .gh-dot {
    width: 6px; height: 6px;
    border-radius: 50%;
    background: #2FAC0C;
    animation: gh-dot 1.4s ease-in-out infinite;
  }
  .gh-dot:nth-child(2) { animation-delay: 0.18s; }
  .gh-dot:nth-child(3) { animation-delay: 0.36s; }

  /* Input bar */
  .gh-input-area {
    padding: 6px 10px 10px;
    background: transparent;
    border-top: none;
    flex-shrink: 0;
  }
  .gh-input-row {
    display: flex;
    align-items: center;
    gap: 8px;
    background: #ffffff;
    border-radius: 28px;
    padding: 4px 6px 4px 12px;
    border: 1.5px solid rgba(47, 172, 12, 0.2);
    transition: border-color 0.2s, box-shadow 0.2s;
  }
  .gh-input-row:focus-within {
    border-color: #2FAC0C;
    box-shadow: 0 0 0 3px rgba(47, 172, 12, 0.15);
  }
  .gh-input-field {
    flex: 1;
    border: none;
    background: transparent;
    outline: none;
    font-size: 11.5px;
    font-family: 'Inter', system-ui, sans-serif;
    color: #252D26;
    line-height: 1.4;
    resize: none;
    min-height: 18px;
    max-height: 80px;
  }
  .gh-input-field::placeholder { color: rgba(37, 45, 38, 0.4); }
  .gh-send-btn {
    width: 28px; height: 28px;
    border-radius: 50%;
    border: none;
    background: #2FAC0C;
    color: #EDE9D4;
    cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
    transition: transform 0.15s, box-shadow 0.15s, opacity 0.15s;
    box-shadow: 0 2px 6px rgba(47, 172, 12, 0.2);
  }
  .gh-send-btn:hover:not(:disabled) {
    transform: scale(1.08);
    box-shadow: 0 4px 12px rgba(47, 172, 12, 0.3);
  }
  .gh-send-btn:active:not(:disabled) { transform: scale(0.95); }
  .gh-send-btn:disabled { opacity: 0.45; cursor: not-allowed; box-shadow: none; }

  /* ── Mascot animations ──────────────────────────────────────────────── */
  .sp-btn { background:none; border:none; padding:0; cursor:pointer;
            outline:none; -webkit-tap-highlight-color:transparent;
            transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1); }
  .sp-btn:hover { transform: scale(1.08); }
  .sp-btn:active { transform: scale(0.95); }
  .sp-btn:focus-visible   { border-radius:50%; outline:3px solid #2FAC0C; outline-offset:6px; }
`;

/* ─────────────────────────────────────────────────────────────────────────
   SPRIG MASCOT  (Frame-by-frame animation from assets)
───────────────────────────────────────────────────────────────────────── */
function SprigMascot() {
  const [frame, setFrame] = useState(1);
  const dirRef = useRef(1);

  useEffect(() => {
    // 30 frames ping-pong (1 to 30, then 30 to 1), 200ms per frame
    const interval = setInterval(() => {
      setFrame((prev) => {
        let next = prev + dirRef.current;
        if (next >= 30) {
          next = 30;
          dirRef.current = -1;
        } else if (next <= 1) {
          next = 1;
          dirRef.current = 1;
        }
        return next;
      });
    }, 200);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ position: "relative", width: 70, height: 85 }}>
      {/* Preload images to prevent flickering on first loop */}
      <div style={{ display: 'none' }}>
        {Array.from({ length: 30 }, (_, i) => i + 1).map(i => (
          <img key={i} src={`/mascot/${i}.png`} alt="preload" />
        ))}
      </div>
      
      <img 
        src={`/mascot/${frame}.png`} 
        alt="GrainHero Mascot"
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          filter: 'drop-shadow(0 6px 12px rgba(37,45,38,0.25))'
        }}
      />
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   THINK ANIMATION MASCOT
───────────────────────────────────────────────────────────────────────── */
function ThinkAnimation() {
  const [frame, setFrame] = useState(1);
  const dirRef = useRef(1);

  useEffect(() => {
    // 5 frames ping-pong, 150ms per frame
    const interval = setInterval(() => {
      setFrame((prev) => {
        let next = prev + dirRef.current;
        if (next >= 5) {
          next = 5;
          dirRef.current = -1;
        } else if (next <= 1) {
          next = 1;
          dirRef.current = 1;
        }
        return next;
      });
    }, 150);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ position: "relative", width: 70, height: 70, flexShrink: 0 }}>
      {/* Preload images to prevent flickering on first loop */}
      <div style={{ display: 'none' }}>
        {Array.from({ length: 5 }, (_, i) => i + 1).map(i => (
          <img key={i} src={`/mascot/think%20${i}.png`} alt="preload" />
        ))}
      </div>
      
      <img 
        src={`/mascot/think%20${frame}.png`} 
        alt="Thinking Mascot"
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
        }}
      />
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────────────────────────────────── */
function formatTime(d: Date) {
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
function uid() {
  return Math.random().toString(36).slice(2);
}

/* ─────────────────────────────────────────────────────────────────────────
   FLOATING CHAT WINDOW
───────────────────────────────────────────────────────────────────────── */
function FloatingChat({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [minimized, setMinimized] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([{ ...INIT_MSG, id: uid(), timestamp: new Date() }]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showQuickReplies, setShowQuickReplies] = useState(true);
  const [closing, setClosing] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLTextAreaElement>(null);

  /* auto-scroll */
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading, showQuickReplies]);

  /* focus input when opened */
  useEffect(() => {
    if (isOpen && !minimized) setTimeout(() => inputRef.current?.focus(), 120);
  }, [isOpen, minimized]);

  const handleClose = useCallback(() => {
    setClosing(true);
    setTimeout(() => { setClosing(false); onClose(); }, 200);
  }, [onClose]);

  const handleReset = useCallback(() => {
    setMessages([{ ...INIT_MSG, id: uid(), timestamp: new Date() }]);
    setSessionId(null);
    setShowQuickReplies(true);
    setInput("");
  }, []);

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setShowQuickReplies(false);
    setInput("");
    setMessages(prev => [...prev, { id: uid(), role: "user", content: trimmed, timestamp: new Date() }]);
    setIsLoading(true);
    try {
      const res = await fetch(`${ML_SERVICE_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: trimmed,
          session_id: sessionId,
          tenant_id: "8f58c2d3-e610-4540-bc99-c946b3659b51",
        }),
      });
      if (!res.ok) throw new Error("AI error");
      const data = await res.json();
      setSessionId(data.session_id);
      setMessages(prev => [...prev, { id: uid(), role: "assistant", content: data.answer, timestamp: new Date() }]);
    } catch {
      toast.error("Failed to reach GrainHero AI.");
      setMessages(prev => [...prev, {
        id: uid(), role: "assistant",
        content: "Sorry, I am currently offline. Please try again shortly.",
        timestamp: new Date(),
      }]);
    } finally {
      setIsLoading(false);
    }
  }, [sessionId]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input); }
  };

  if (!isOpen) return null;

  return (
    <div className={`gh-window${minimized ? " minimized" : ""}${closing ? " closing" : ""}`}>
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="gh-header">
        <div className="gh-avatar">
          <Sprout size={14} color="#EDE9D4" />
        </div>
        <div className="gh-header-info">
          <div className="gh-header-name">GrainHero AI Assistant</div>
        </div>
        <div className="gh-header-actions">
          <button className="gh-icon-btn" title="New conversation" onClick={handleReset}>
            <RefreshCw size={13} />
          </button>
          <button className="gh-icon-btn" title={minimized ? "Expand" : "Minimize"} onClick={() => setMinimized(v => !v)}>
            {minimized ? <ChevronDown size={14} /> : <Minimize2 size={13} />}
          </button>
        </div>
      </div>

      {/* ── Body (hidden when minimized) ─────────────────────────── */}
      {!minimized && (
        <>
          {/* Messages */}
          <div className="gh-messages" ref={scrollRef}>
            {messages.map((msg) => (
              <div key={msg.id} className={`gh-msg-row ${msg.role}`}>
                {msg.role === "assistant" && (
                  <div className="gh-msg-avatar">
                    <Sprout size={14} color="#EDE9D4" />
                  </div>
                )}
                <div className="gh-msg-meta">
                  <div className={`gh-bubble ${msg.role === "assistant" ? "bot" : "user"}`}>
                    {msg.role === "assistant"
                      ? msg.content
                          .replace(/(\d+\.\s)/g, "\n$1")
                          .split("\n")
                          .map((line, i) => line.trim())
                          .filter((line) => line.length > 0)
                          .map((line, i) => <div key={i} style={{ marginBottom: "4px" }}>{line}</div>)
                      : msg.content
                    }
                  </div>
                  <div className="gh-msg-time">{formatTime(msg.timestamp)}</div>
                </div>
                {msg.role === "user" && (
                  <div className="gh-msg-avatar" style={{ background: "#2FAC0C", borderColor: "#EDE9D4" }}>
                    <User size={14} color="#EDE9D4" />
                  </div>
                )}
              </div>
            ))}

            {/* Typing indicator */}
            {isLoading && (
              <div className="gh-typing">
                <div className="gh-typing-avatar">
                  <Sprout size={14} color="#EDE9D4" />
                </div>
                <div className="gh-typing-bubble">
                  <div className="gh-dot" />
                  <div className="gh-dot" />
                  <div className="gh-dot" />
                </div>
              </div>
            )}
            
            {/* Quick replies (moved inside messages scroll area to prevent cutoff) */}
            {showQuickReplies && !isLoading && (
              <div className="gh-quick-replies">
                {QUICK_REPLIES.map((qr) => (
                  <button key={qr.text} className="gh-qr-btn" onClick={() => sendMessage(qr.text)}>
                    {qr.icon} {qr.text}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Input */}
          <div className="gh-input-area">
            <div className="gh-input-row">
              <textarea
                ref={inputRef}
                className="gh-input-field"
                placeholder="Ask about silos, manuals, or alerts..."
                value={input}
                rows={1}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isLoading}
              />
              <button
                className="gh-send-btn"
                disabled={isLoading || !input.trim()}
                onClick={() => sendMessage(input)}
                aria-label="Send"
              >
                {isLoading
                  ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />
                  : <Send size={13} />
                }
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   ROOT COMPONENT
───────────────────────────────────────────────────────────────────────── */
function AIAssistantBase() {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleScroll = () => {
      setIsOpen(false);
    };

    // Small delay prevents the opening click from instantly triggering the listener
    setTimeout(() => {
      document.addEventListener("mousedown", handleOutsideClick);
      window.addEventListener("scroll", handleScroll, { passive: true });
    }, 10);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      window.removeEventListener("scroll", handleScroll);
    };
  }, [isOpen]);

  return (
    <div ref={containerRef}>
      <style dangerouslySetInnerHTML={{ __html: ALL_CSS }} />

      {/* Floating chat */}
      <FloatingChat isOpen={isOpen} onClose={() => setIsOpen(false)} />

      {/* Think animation — peeks below the chat window when open */}
      {isOpen && (
        <div style={{
          position: "fixed",
          bottom: 0,
          right: 28,
          zIndex: 10000,
          pointerEvents: "none",
        }}>
          <ThinkAnimation />
        </div>
      )}

      {/* Mascot trigger */}
      {!isOpen && (
        <button
          className="sp-btn"
          style={{ position: "fixed", bottom: 20, right: 20, zIndex: 9998 }}
          aria-label="Open GrainHero AI Assistant"
          onClick={() => setIsOpen((v) => !v)}
        >
          <SprigMascot />
        </button>
      )}
    </div>
  );
}

export const AIAssistant = () => (
  <ErrorBoundary
    fallback={
      <div style={{
        position: "fixed", bottom: 24, right: 24, zIndex: 9999,
        padding: "10px 16px", background: "#fee2e2", color: "#dc2626",
        borderRadius: 12, fontSize: 13,
      }}>
        AI Unavailable
      </div>
    }
  >
    <AIAssistantBase />
  </ErrorBoundary>
);
