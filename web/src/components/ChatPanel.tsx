import { useState, useRef, useEffect } from "react";
import type { Venue } from "../data/types";
import type { Filters } from "../data/types";
import type { ChatMessage } from "../hooks/useChatEngine";
import type { FilterOp } from "../data/chatFilterEngine";
import { VenueCard } from "./VenueCard";
import { Send, RotateCcw, X } from "lucide-react";

interface Props {
  messages: ChatMessage[];
  filters: Filters;
  isTyping: boolean;
  onSend: (text: string) => void;
  onReset: () => void;
  onVenueClick: (v: Venue) => void;
  onRemoveFilter?: (key: keyof Filters) => void;
}

/* ─── Active filter chip rendering ─── */
function buildActiveChips(f: Filters): { key: keyof Filters; label: string; icon: string }[] {
  const chips: { key: keyof Filters; label: string; icon: string }[] = [];
  if (f.cuisine) chips.push({ key: "cuisine", label: f.cuisine, icon: "🍽️" });
  if (f.diet) chips.push({ key: "diet", label: f.diet, icon: "🥗" });
  if (f.price_tier) {
    const tierLabel = ["", "$", "$$", "$$$", "$$$$"][f.price_tier] ?? "";
    chips.push({ key: "price_tier", label: tierLabel, icon: "💰" });
  }
  if (f.healthiness_min > 0) {
    const lbl = f.healthiness_min >= 0.9 ? "Very Healthy" : f.healthiness_min >= 0.7 ? "Healthy" : "Light";
    chips.push({ key: "healthiness_min", label: lbl, icon: "🥗" });
  }
  if (f.radius_km < 50) {
    const lbl = f.radius_km <= 1 ? "Walking" : f.radius_km <= 3 ? "Nearby" : `Within ${Math.round(f.radius_km)} km`;
    chips.push({ key: "radius_km", label: lbl, icon: "📍" });
  }
  if (f.rating_min > 0) chips.push({ key: "rating_min", label: `★ ${f.rating_min}+`, icon: "⭐" });
  if (f.review_count_min > 0) chips.push({ key: "review_count_min", label: `${f.review_count_min}+ reviews`, icon: "💬" });
  if ((f.with_users?.length ?? 0) > 0) {
    chips.push({ key: "with_users", label: `${f.with_users!.length} friend(s)`, icon: "👥" });
  }
  if (f.visit_status && f.visit_status !== "any") {
    const statusMap: Record<string, string> = {
      wishlist: "Want to Try",
      visited: "Visited",
      favourite: "Favourite",
      not_for_me: "Not For Me",
    };
    chips.push({ key: "visit_status", label: statusMap[f.visit_status] ?? f.visit_status, icon: "🔖" });
  }
  if (f.query) chips.push({ key: "query", label: `"${f.query}"`, icon: "🔍" });
  return chips;
}

function SuggestedChip({ op, onClick }: { op: FilterOp; onClick: (op: FilterOp) => void }) {
  return (
    <button
      onClick={() => onClick(op)}
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium transition ${
        op.type === "set"
          ? "bg-sienna-100 text-sienna-700 hover:bg-sienna-200"
          : "bg-stone-100 text-stone-600 hover:bg-stone-200"
      }`}
      title={op.type === "set" ? "Click to apply" : "Click to clear"}
    >
      <span>{op.type === "set" ? "＋" : "−"}</span>
      <span className="text-base leading-none">{op.icon}</span>
      <span>{op.label}</span>
    </button>
  );
}

export function ChatPanel({ messages, filters, isTyping, onSend, onReset, onVenueClick, onRemoveFilter }: Props) {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeChips = buildActiveChips(filters);

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

  // Clicking a suggested op just triggers a text message in our current design,
  // but expanding this later can make it toggle. For now, the ops are informational.
  const handleChipClick = (op: FilterOp) => {
    // noop: the AI has already merged; chips are just visual confirmation
    // Future: toggle individual filters back off
    console.log("Filter op clicked:", op);
  };

  return (
    <div className="flex h-full flex-col border-r border-cream-dark bg-paper">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-cream-dark px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sienna-50 text-sienna-600">
            <span className="text-sm font-bold">t</span>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-ink">taste concierge</h3>
            <p className="text-[11px] text-ink-faint">Your well-fed friend</p>
          </div>
        </div>
        <button
          onClick={onReset}
          title="Start over"
          aria-label="Start over"
          className="rounded-lg p-1.5 text-ink-faint transition hover:bg-cream hover:text-ink-muted"
        >
          <RotateCcw size={14} />
        </button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[90%] ${msg.role === "user" ? "items-end" : "items-start"}`}>
              {msg.role === "ai" && (
                <div className="mb-1 flex items-center gap-1.5">
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-sienna-100 text-[10px] font-bold text-sienna-700">
                    t
                  </div>
                  <span className="text-[11px] font-medium text-ink-faint">taste</span>
                </div>
              )}
              <div
                className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm whitespace-pre-line ${
                  msg.role === "user"
                    ? "bg-sienna-500 text-white"
                    : "bg-cream text-ink-light"
                }`}
              >
                {msg.text}
              </div>

              {/* Suggested filter chips */}
              {msg.role === "ai" && msg.ops && msg.ops.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {msg.ops.map((op, i) => (
                    <SuggestedChip key={i} op={op} onClick={handleChipClick} />
                  ))}
                </div>
              )}

              {/* Inline venue grid */}
              {msg.role === "ai" && msg.venues && msg.venues.length > 0 && (
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

      {/* Active filter chips */}
      {activeChips.length > 0 && (
        <div className="border-t border-cream-dark bg-cream/50 px-4 py-2">
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-ink-faint">
            Active Filters
          </p>
          <div className="flex flex-wrap gap-1.5">
            {activeChips.map((chip) => (
              <button
                key={chip.key}
                onClick={() => onRemoveFilter?.(chip.key)}
                className="inline-flex items-center gap-1 rounded-full bg-ink/5 px-2 py-1 text-[11px] font-medium text-ink-muted transition hover:bg-red-50 hover:text-red-600"
                title={`Remove ${chip.label}`}
              >
                <span className="text-base leading-none">{chip.icon}</span>
                <span>{chip.label}</span>
                <X size={10} className="opacity-60" />
              </button>
            ))}
          </div>
        </div>
      )}

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
