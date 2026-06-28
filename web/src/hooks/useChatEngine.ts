import { useState, useCallback, useRef } from "react";
import type { Venue, TasteProfile, Filters } from "../data/types";
import { filterVenues, defaultFilters, mergeFilters } from "../data/filterEngine";
import { computeFilterDiff, type FilterOp } from "../data/chatFilterEngine";
import { SAMPLE_USERS } from "../data/mockData";

/* ─── Public types ─── */

export type ChatPhase = "greeting" | "presenting" | "refining";

export interface ChatMessage {
  id: string;
  role: "user" | "ai";
  text: string;
  venues?: Venue[];
  summary?: string;
  /** Filter operations proposed by the AI on this turn */
  ops?: FilterOp[];
}

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

/* ─── Personality copy ─── */

const OPENERS = [
  "What are we after? Tell me what's important — cuisine, budget, location, health — and I'll tune the filters.",
  "Looking for a spot. Give me a vibe or constraint and I'll set the filters right here.",
  "Say something like 'Italian, cheap, nearby' and I'll show you exactly what's selected.",
];

const PRESENT_TEMPLATES = [
  (count: number, top?: Venue) =>
    `I found ${count} spot${count === 1 ? "" : "s"}.${top ? ` Top pick: **${top.name}**.` : ""}`,
  (count: number, top?: Venue) =>
    `${count} result${count === 1 ? "" : "s"} with those filters.${top ? ` I'd try **${top.name}** first.` : ""}`,
  (count: number, top?: Venue) =>
    `Got ${count}.${top ? ` **${top.name}** stands out.` : ""} Adjust the chips below if you want to loosen or tighten.`,
];

const NO_MATCH_TEXT = "Nothing matches those filters. Try removing one or broadening the criteria.";

/* ─── Helpers ─── */

function friendName(filters: Filters): string | undefined {
  const names = (filters.with_users ?? [])
    .map((id) => SAMPLE_USERS.find((u) => u.id === id)?.name)
    .filter((n): n is string => !!n);
  if (names.length === 0) return undefined;
  return names.join(", ");
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function buildAiText(
  diff: { ops: FilterOp[]; confidence: number },
  count: number,
  top?: Venue,
  phase: ChatPhase = "presenting"
): string {
  const lines: string[] = [];

  // 1) Describe what changed
  const setOps = diff.ops.filter((o) => o.type === "set");
  const clearOps = diff.ops.filter((o) => o.type === "clear");

  if (setOps.length > 0) {
    const chips = setOps.map((o) => `${o.icon} ${o.label}`).join(", ");
    lines.push(`Set: ${chips}.`);
  }
  if (clearOps.length > 0) {
    const chips = clearOps.map((o) => `${o.icon} ${o.label}`).join(", ");
    lines.push(`Cleared: ${chips}.`);
  }

  if (diff.confidence < 0.3 && setOps.length === 0 && clearOps.length === 0) {
    lines.push("I didn't catch any filter changes from that. Mind rephrasing?");
    return lines.join(" ");
  }

  // 2) Presentation copy
  if (count === 0) {
    lines.push(NO_MATCH_TEXT);
  } else if (phase === "presenting" || phase === "refining") {
    if (count > 12) {
      lines.push(`${pick(PRESENT_TEMPLATES)(count, top)} Too many options — tighten a filter if you want fewer.`);
    } else {
      lines.push(pick(PRESENT_TEMPLATES)(count, top));
    }
  }

  return lines.join("\n\n");
}

/* ─── Engine hook ─── */

export function useChatEngine(profile: TasteProfile) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: uid(), role: "ai", text: pick(OPENERS) },
  ]);
  const [phase, setPhase] = useState<ChatPhase>("greeting");
  const [filters, setFilters] = useState<Filters>(defaultFilters());
  const [isTyping, setIsTyping] = useState(false);
  const turnRef = useRef(0);

  const computeResults = useCallback(
    (currentFilters: Filters) => {
      return filterVenues(currentFilters, profile);
    },
    [profile]
  );

  const send = useCallback(
    (text: string) => {
      const userMsg: ChatMessage = { id: uid(), role: "user", text };
      setMessages((prev) => [...prev, userMsg]);
      setIsTyping(true);
      turnRef.current += 1;

      setTimeout(() => {
        // Compute filter diff against CURRENT state
        const current = filters;
        const diff = computeFilterDiff(text, current);

        // Merge changes into filter state unconditionally
        // (the UI shows chips; user can reject by clicking them off)
        const nextFilters = mergeFilters(current, diff.nextFilters);
        setFilters(nextFilters);

        const results = computeResults(nextFilters);
        const top = results[0];
        const count = results.length;
        const friend = friendName(nextFilters);

        const aiText = buildAiText(diff, count, top, phase);
        const fullText = friend ? `For you and ${friend}:\n\n${aiText}` : aiText;

        setMessages((prev) => [
          ...prev,
          {
            id: uid(),
            role: "ai",
            text: fullText,
            venues: results.slice(0, 6),
            summary: `${count} results. Top: ${top?.name ?? "—"}.`,
            ops: diff.ops,
          },
        ]);

        setPhase("presenting");
        setIsTyping(false);
      }, 500 + Math.random() * 400);
    },
    [filters, phase, computeResults]
  );

  const reset = useCallback(() => {
    setMessages([{ id: uid(), role: "ai", text: pick(OPENERS) }]);
    setPhase("greeting");
    setFilters(defaultFilters());
    turnRef.current = 0;
  }, []);

  /** Apply new filters from the FilterPanel (or direct chip clicks) */
  const applyFilters = useCallback(
    (newFilters: Filters) => {
      setFilters(newFilters);
      const results = computeResults(newFilters);
      const top = results[0];
      const count = results.length;

      setMessages((prev) => [
        ...prev,
        {
          id: uid(),
          role: "ai",
          text: count === 0 ? NO_MATCH_TEXT : `${count} result${count === 1 ? "" : "s"}.${top ? ` Top pick: **${top.name}**.` : ""}`,
          venues: results.slice(0, 6),
          summary: `${count} results. Top: ${top?.name ?? "—"}.`,
          ops: [],
        },
      ]);
      setPhase("presenting");
    },
    [computeResults]
  );

  /** Remove a single filter field (called when user clicks an active chip) */
  const removeFilter = useCallback(
    (key: keyof Filters) => {
      const resetValue = defaultFilters()[key];
      const next = { ...filters, [key]: resetValue };
      setFilters(next);
      const results = computeResults(next);
      setMessages((prev) => [
        ...prev,
        {
          id: uid(),
          role: "ai",
          text: `Removed ${String(key)}. ${results.length} result${results.length === 1 ? "" : "s"} remain.`,
          venues: results.slice(0, 6),
          ops: [{ type: "clear", key, label: String(key), icon: "🗑️" }],
        },
      ]);
    },
    [filters, computeResults]
  );

  const results = computeResults(filters);

  return {
    messages,
    phase,
    filters,
    isTyping,
    results,
    send,
    reset,
    applyFilters,
    removeFilter,
  };
}
