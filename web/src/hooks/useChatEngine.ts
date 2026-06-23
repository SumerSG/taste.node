import { useState, useCallback, useRef } from "react";
import type { Venue, TasteProfile, Filters } from "../data/types";
import { filterVenues, defaultFilters, mergeFilters } from "../data/filterEngine";
import { parseChatQuery } from "../utils/chatParser";

export type ChatPhase = "greeting" | "gathering" | "presenting" | "refining";

export interface ChatMessage {
  id: string;
  role: "user" | "ai";
  text: string;
  venues?: Venue[];
  summary?: string;
}

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

/* ─── Personality: Well-traveled regular ─── */

const OPENERS = [
  "Alright, what are we after? Something specific, or should I just throw my best recent hits at you?",
  "Hungry? Tell me what you're craving — or what you're definitely *not* in the mood for.",
  "Looking for a spot. Give me a vibe, a cuisine, a budget, whatever. I'll fill in the blanks.",
];

const CUISINE_PROMPTS = [
  "What cuisine are you gravitating toward? Or what are you *not* in the mood for?",
  "Any cuisine in mind? I'm impartial, but I have opinions.",
  "Japanese? Italian? Korean? Or surprise me?",
];

const BUDGET_PROMPTS = [
  "What's the budget looking like — casual weeknight or special occasion?",
  "Are we keeping it under 2,000 yen per head, or treating ourselves?",
  "Price check: cheap eats, mid-range, or go all out?",
];

const VIBE_PROMPTS = [
  "Who's joining — solo, date, group dinner? Changes the math.",
  "What's the occasion? Just hungry, or is this a thing?",
  "Solo decompress, date night, or group chaos?",
];

const LOCATION_PROMPTS = [
  "How far are you willing to travel? Walking distance or train-ride committed?",
  "Any neighborhood in mind, or should I just look nearby?",
  "Staying local, or is a 20-minute train ride fine?",
];

const PRESENT_TEMPLATES = [
  (count: number, top: string) =>
    `I'm seeing ${count} spots that fit. The standout for me is ${top} — I'd start there. Too many? Tell me what to tighten.`,
  (count: number, top: string) =>
    `Found ${count} places. ${top} is probably your best bet. Want me to narrow it down more?`,
  (count: number, top: string) =>
    `Here are ${count} spots. I'd personally try ${top} first — it's been consistent every time I've sent people there.`,
];

const REFINE_TEMPLATES = [
  (count: number, top: string) =>
    `Narrowed it to ${count}. ${top} is still my pick. Tight enough?`,
  (count: number, top: string) =>
    `Down to ${count}. I'd go with ${top}. Anything else to adjust?`,
  (count: number) =>
    `Only ${count} left. We can back off a constraint if that's too tight.`,
];

const TOO_MANY_TEMPLATE =
  "That's a lot of results. Tell me what to tighten — cuisine, budget, distance, vibe?";


const NO_MATCH_TEMPLATE =
  "I couldn't find anything that matches. Want to back off a constraint?";

function getOpener() {
  return OPENERS[Math.floor(Math.random() * OPENERS.length)];
}

function getPrompt(missing: string[]): string {
  if (!missing.length) return "";
  const next = missing[0];
  const lists: Record<string, string[]> = {
    cuisine: CUISINE_PROMPTS,
    budget: BUDGET_PROMPTS,
    vibe: VIBE_PROMPTS,
    location: LOCATION_PROMPTS,
  };
  const pool = lists[next] ?? ["Tell me more."];
  return pool[Math.floor(Math.random() * pool.length)];
}

function getPresentText(count: number, topVenue: Venue | undefined): string {
  if (!topVenue) return NO_MATCH_TEMPLATE;
  const fn = PRESENT_TEMPLATES[Math.floor(Math.random() * PRESENT_TEMPLATES.length)];
  return fn(count, topVenue.name);
}

function getRefineText(count: number, topVenue: Venue | undefined): string {
  if (!topVenue) return NO_MATCH_TEMPLATE;
  if (count <= 3) {
    return `Only ${count} left. We can back off a constraint if that's too tight.`;
  }
  const fn = REFINE_TEMPLATES[Math.floor(Math.random() * 2)];
  return fn(count, topVenue.name);
}

/* ─── Missing-info detection ─── */

function detectMissing(filters: Filters): string[] {
  const missing: string[] = [];
  if (!filters.cuisine && !filters.query) missing.push("cuisine");
  if (!filters.price_tier) missing.push("budget");
  if (filters.radius_km >= 50) missing.push("location");
  return missing;
}

/* ─── Engine ─── */

export function useChatEngine(profile: TasteProfile) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: uid(), role: "ai", text: getOpener() },
  ]);
  const [phase, setPhase] = useState<ChatPhase>("greeting");
  const [filters, setFilters] = useState<Filters>(defaultFilters());
  const [isTyping, setIsTyping] = useState(false);
  const turnRef = useRef(0);

  const computeResults = useCallback(
    (currentFilters: Filters) => {
      const results = filterVenues(currentFilters, profile);
      return results;
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
        const parsed = parseChatQuery(text);
        const newFilters = mergeFilters(filters, parsed.filters);
        // If user typed something that looks like a query but parser missed it, treat as text search
        if (text.length > 2 && !parsed.filters.cuisine && !parsed.filters.query) {
          newFilters.query = text;
        }
        setFilters(newFilters);

        const results = computeResults(newFilters);
        const top = results[0];

        if (phase === "greeting" || phase === "gathering") {
          const missing = detectMissing(newFilters);
          if (missing.length > 0 && turnRef.current < 4) {
            const prompt = getPrompt(missing);
            setMessages((prev) => [
              ...prev,
              { id: uid(), role: "ai", text: prompt },
            ]);
            setPhase("gathering");
          } else {
            const count = results.length;
            let summary: string;
            if (count === 0) {
              summary = NO_MATCH_TEMPLATE;
            } else if (count > 12) {
              summary = `${getPresentText(count, top)} ${TOO_MANY_TEMPLATE}`;
            } else {
              summary = getPresentText(count, top);
            }
            setMessages((prev) => [
              ...prev,
              {
                id: uid(),
                role: "ai",
                text: summary,
                venues: results.slice(0, 6),
                summary: `Found ${count} places. Top: ${top?.name ?? "None"}.`,
              },
            ]);
            setPhase("presenting");
          }
        } else if (phase === "presenting" || phase === "refining") {
          const count = results.length;
          let summary: string;
          if (count === 0) {
            summary = NO_MATCH_TEMPLATE;
          } else if (count <= 3) {
            summary = getRefineText(count, top);
          } else if (count > 12) {
            summary = `${getRefineText(count, top)} ${TOO_MANY_TEMPLATE}`;
          } else {
            summary = getRefineText(count, top);
          }
          setMessages((prev) => [
            ...prev,
            {
              id: uid(),
              role: "ai",
              text: summary,
              venues: results.slice(0, 6),
              summary: `Found ${count} places. Top: ${top?.name ?? "None"}.`,
            },
          ]);
          setPhase("presenting");
        }

        setIsTyping(false);
      }, 500 + Math.random() * 400);
    },
    [filters, phase, computeResults]
  );

  const reset = useCallback(() => {
    setMessages([{ id: uid(), role: "ai", text: getOpener() }]);
    setPhase("greeting");
    setFilters(defaultFilters());
    turnRef.current = 0;
  }, []);

  const applyFilters = useCallback(
    (newFilters: Filters) => {
      setFilters(newFilters);
      const results = computeResults(newFilters);
      const top = results[0];
      const count = results.length;
      const summary =
        count === 0
          ? NO_MATCH_TEMPLATE
          : getPresentText(Math.min(count, 12), top);
      setMessages((prev) => [
        ...prev,
        {
          id: uid(),
          role: "ai",
          text: `Updated filters. ${summary}`,
          venues: results.slice(0, 6),
          summary: `Found ${count} places. Top: ${top?.name ?? "None"}.`,
        },
      ]);
      setPhase("presenting");
    },
    [computeResults]
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
  };
}
