import { useState, useRef, useEffect } from "react";
import type { Venue } from "../data/types";
import type { ChatMessage } from "../hooks/useChatEngine";
import { VenueCard } from "./VenueCard";
import { Send, RotateCcw, ChefHat } from "lucide-react";

interface Props {
  messages: ChatMessage[];
  isTyping: boolean;
  onSend: (text: string) => void;
  onReset: () => void;
  onVenueClick: (v: Venue) => void;
}

export function ChatPanel({ messages, isTyping, onSend, onReset, onVenueClick }: Props) {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;
    onSend(text);
    setInput("");
  };

  return (
    <div className="flex h-full flex-col border-r border-cream-dark bg-paper">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-cream-dark px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sienna-50 text-sienna-600">
            <ChefHat size={16} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-ink">taste concierge</h3>
            <p className="text-[11px] text-ink-faint">Your well-fed friend</p>
          </div>
        </div>
        <button
          onClick={onReset}
          title="Start over"
          className="rounded-lg p-1.5 text-ink-faint transition hover:bg-cream hover:text-ink-muted"
        >
          <RotateCcw size={14} />
        </button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] ${msg.role === "user" ? "items-end" : "items-start"}`}>
              {msg.role === "ai" && (
                <div className="mb-1 flex items-center gap-1.5">
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-sienna-100 text-[10px] font-bold text-sienna-700">
                    t
                  </div>
                  <span className="text-[11px] font-medium text-ink-faint">taste</span>
                </div>
              )}
              <div
                className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm ${
                  msg.role === "user"
                    ? "bg-sienna-500 text-white"
                    : "bg-cream text-ink-light"
                }`}
              >
                {msg.text}
              </div>

              {/* Inline venue grid */}
              {msg.venues && msg.venues.length > 0 && (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {msg.venues.map((v) => (
                    <VenueCard
                      key={v.id}
                      venue={v}
                      compact
                      onClick={() => onVenueClick(v)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex justify-start">
            <div className="flex items-center gap-2 rounded-2xl bg-cream px-4 py-3 shadow-sm">
              <div className="flex gap-1">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-ink-faint" style={{ animationDelay: "0ms" }} />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-ink-faint" style={{ animationDelay: "150ms" }} />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-ink-faint" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="border-t border-cream-dark p-3">
        <div className="flex items-center gap-2 rounded-xl border border-cream-dark bg-cream px-3 py-2 transition focus-within:border-sienna-400 focus-within:ring-2 focus-within:ring-sienna-100">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Tell me what you're craving..."
            className="flex-1 bg-transparent text-sm text-ink placeholder:text-ink-faint focus:outline-none"
          />
          <button
            type="submit"
            disabled={!input.trim() || isTyping}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sienna-500 text-white shadow-sm transition hover:bg-sienna-600 disabled:opacity-40 disabled:hover:bg-sienna-500"
          >
            <Send size={14} />
          </button>
        </div>
        <p className="mt-1.5 text-center text-[10px] text-ink-faint">
          Tip: Say things like "Italian under $$, healthy, near Shibuya"
        </p>
      </form>
    </div>
  );
}
