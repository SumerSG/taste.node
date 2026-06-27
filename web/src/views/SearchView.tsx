import { useState, useCallback, useEffect } from "react";
import type { Venue, TasteProfile, RankedItem } from "../data/types";
import { useChatEngine } from "../hooks/useChatEngine";
import { defaultFilters } from "../data/filterEngine";
import { addRankedItem, createContext } from "../data/api";
import { ChatPanel } from "../components/ChatPanel";
import { FilterPanel } from "../components/FilterPanel";
import { VenueCard } from "../components/VenueCard";
import { VenueDetailModal } from "../components/VenueDetailModal";
import { SlidersHorizontal, LayoutGrid, MessageCircle } from "lucide-react";

interface Props {
  profile: TasteProfile;
  onProfileChange: (p: TasteProfile) => void;
  initialQuery?: string;
  onNavigateToVenue?: (venue: Venue) => void;
}

export function SearchView({ profile, onProfileChange, initialQuery = "", onNavigateToVenue }: Props) {
  const {
    messages,
    isTyping,
    filters,
    results,
    send,
    reset,
    applyFilters,
  } = useChatEngine(profile);

  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<"chat" | "grid">("chat");

  // Seed chat with initial query from global search bar
  useEffect(() => {
    if (initialQuery.trim()) {
      const t = setTimeout(() => send(initialQuery.trim()), 100);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleManualFilters = useCallback(
    (newFilters: ReturnType<typeof defaultFilters>) => {
      applyFilters(newFilters);
    },
    [applyFilters]
  );

  const handleVenueClick = useCallback((venue: Venue) => {
    setSelectedVenue(venue);
  }, []);

  const handleAdd = useCallback(
    (item: RankedItem, contextId: string) => {
      let p = profile;
      if (!p.contexts[contextId]) {
        p = createContext(p, contextId);
      }
      onProfileChange(addRankedItem(p, item, undefined, contextId));
      setSelectedVenue(null);
    },
    [profile, onProfileChange]
  );

  const displayResults = results;

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-0 overflow-hidden rounded-2xl border border-cream-dark bg-paper shadow-card sm:h-[calc(100vh-9rem)]">
      {/* Left: Chat (desktop always, mobile tabbed) */}
      <div
        className={`flex h-full flex-col ${
          viewMode === "chat" ? "flex" : "hidden"
        } w-full lg:flex lg:w-[420px] lg:flex-shrink-0`}
      >
        <ChatPanel
          messages={messages}
          isTyping={isTyping}
          onSend={send}
          onReset={reset}
          onVenueClick={handleVenueClick}
        />
      </div>

      {/* Right: Results grid + controls */}
      <div
        className={`flex h-full min-w-0 flex-1 flex-col ${
          viewMode === "grid" ? "flex" : "hidden"
        } lg:flex`}
      >
        {/* Toolbar */}
        <div className="flex items-center justify-between border-b border-cream-dark bg-cream px-4 py-2.5">
          <div className="flex items-center gap-3">
            {/* Mobile view toggle */}
            <div className="flex items-center rounded-lg bg-paper ring-1 ring-cream-dark lg:hidden">
              <button
                onClick={() => setViewMode("chat")}
                className={`flex items-center gap-1 rounded-l-lg px-2.5 py-1.5 text-xs font-medium transition min-h-[44px] ${
                  viewMode === "chat"
                    ? "bg-sienna-50 text-sienna-700"
                    : "text-ink-faint"
                }`}
              >
                <MessageCircle size={13} /> Chat
              </button>
              <button
                onClick={() => setViewMode("grid")}
                className={`flex items-center gap-1 rounded-r-lg px-2.5 py-1.5 text-xs font-medium transition min-h-[44px] ${
                  viewMode === "grid"
                    ? "bg-sienna-50 text-sienna-700"
                    : "text-ink-faint"
                }`}
              >
                <LayoutGrid size={13} /> Grid
              </button>
            </div>

            <span className="text-sm text-ink-muted">
              {displayResults.length} result
              {displayResults.length !== 1 ? "s" : ""}
            </span>
          </div>

          <button
            onClick={() => setShowFilters((s) => !s)}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold shadow-sm ring-1 transition-all min-h-[44px] sm:min-h-0 ${
              showFilters
                ? "bg-sienna-50 text-sienna-700 ring-sienna-200"
                : "bg-paper text-ink-muted ring-cream-dark hover:bg-cream"
            }`}
          >
            <SlidersHorizontal size={14} />
            Filters
          </button>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {displayResults.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-cream-dark py-20 text-center">
              <MessageCircle size={40} className="mb-3 text-ink-faint" />
              <p className="font-serif text-lg text-ink-muted">
                No places match yet
              </p>
              <p className="text-sm text-ink-faint mt-1 mb-5 max-w-xs">
                Chat with the concierge or open filters to find something.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {displayResults.map((venue) => (
                <VenueCard
                  key={venue.id}
                  venue={venue}
                  onAdd={() => setSelectedVenue(venue)}
                  onClick={() => onNavigateToVenue?.(venue)}
                  compact
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Filter panel (right drawer / sidebar) */}
      <FilterPanel
        profile={profile}
        filters={filters}
        onChange={handleManualFilters}
        open={showFilters}
        onClose={() => setShowFilters(false)}
      />

      {/* Detail modal */}
      {selectedVenue && (
        <VenueDetailModal
          venue={selectedVenue}
          profile={profile}
          open={!!selectedVenue}
          onClose={() => setSelectedVenue(null)}
          onAdd={handleAdd}
        />
      )}
    </div>
  );
}
