import { useMemo, useState, useCallback } from "react";
import type { Venue, TasteProfile } from "../data/types";
import { filterAndSortVenues, TOP_CUISINES } from "../data/mockData";
import { addRankedItem } from "../data/api";
import { VenueCard } from "../components/VenueCard";
import { VenueDetailModal } from "../components/VenueDetailModal";
import {
  Search, X, BookOpen, SlidersHorizontal, ArrowDownUp,
  Leaf, Fish, Beef, HeartPulse,
} from "lucide-react";

interface Props {
  profile: TasteProfile;
  onProfileChange: (p: TasteProfile) => void;
  initialQuery?: string;
}

const SORT_OPTIONS = [
  { value: "relevance", label: "Relevance" },
  { value: "name", label: "Name" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
  { value: "health_desc", label: "Healthiest First" },
  { value: "distance", label: "Nearest First" },
];

const PRICE_TIERS = [
  { value: 1, label: "$", hint: "Budget" },
  { value: 2, label: "$$", hint: "Mid-range" },
  { value: 3, label: "$$$", hint: "Premium" },
  { value: 4, label: "$$$$", hint: "Fine dining" },
];

const DIETARY_OPTIONS = [
  { value: "veg", label: "Vegetarian", icon: <Leaf size={13} /> },
  { value: "fish", label: "Pescatarian", icon: <Fish size={13} /> },
  { value: "meat", label: "Meat", icon: <Beef size={13} /> },
];

const HEALTH_PRESETS = [
  { value: 0, label: "Any" },
  { value: 0.5, label: "Healthy" },
  { value: 0.7, label: "Very healthy" },
  { value: 0.8, label: "Super healthy" },
];

function toggleInArray<T>(arr: T[], val: T): T[] {
  return arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val];
}

export function SearchView({ profile, onProfileChange, initialQuery = "" }: Props) {
  const [query, setQuery] = useState(initialQuery);
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);
  const [showFiltersMobile, setShowFiltersMobile] = useState(false);

  const [selectedCuisines, setSelectedCuisines] = useState<string[]>([]);
  const [selectedPrices, setSelectedPrices] = useState<number[]>([]);
  const [selectedDietary, setSelectedDietary] = useState<string[]>([]);
  const [minHealthScore, setMinHealthScore] = useState<number>(0);
  const [sortBy, setSortBy] = useState("relevance");

  const results = useMemo(
    () => filterAndSortVenues(query, selectedCuisines, selectedPrices, selectedDietary, minHealthScore, sortBy),
    [query, selectedCuisines, selectedPrices, selectedDietary, minHealthScore, sortBy]
  );

  const activeFilters = useMemo(() => {
    const filters: { label: string; key: string; onRemove: () => void }[] = [];
    if (query) filters.push({ label: `"${query}"`, key: "query", onRemove: () => setQuery("") });
    selectedCuisines.forEach((c) => filters.push({ label: c, key: `c-${c}`, onRemove: () => setSelectedCuisines((prev) => prev.filter((x) => x !== c)) }));
    selectedPrices.forEach((p) => filters.push({ label: PRICE_TIERS.find((t) => t.value === p)?.label ?? `$${p}`, key: `p-${p}`, onRemove: () => setSelectedPrices((prev) => prev.filter((x) => x !== p)) }));
    selectedDietary.forEach((d) => filters.push({ label: DIETARY_OPTIONS.find((o) => o.value === d)?.label ?? d, key: `d-${d}`, onRemove: () => setSelectedDietary((prev) => prev.filter((x) => x !== d)) }));
    if (minHealthScore > 0) {
      const preset = HEALTH_PRESETS.find((h) => h.value === minHealthScore);
      filters.push({ label: preset?.label ?? `Health ≥${minHealthScore}`, key: "health", onRemove: () => setMinHealthScore(0) });
    }
    return filters;
  }, [query, selectedCuisines, selectedPrices, selectedDietary, minHealthScore]);

  const clearAllFilters = useCallback(() => {
    setQuery("");
    setSelectedCuisines([]);
    setSelectedPrices([]);
    setSelectedDietary([]);
    setMinHealthScore(0);
    setSortBy("relevance");
  }, []);

  const hasActiveFilters = activeFilters.length > 0 || sortBy !== "relevance";

  const FilterRailContent = (
    <div className="space-y-6">
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search name or cuisine..."
          className="w-full rounded-xl border border-cream-dark bg-paper py-2.5 pl-10 pr-9 text-sm shadow-sm transition focus:border-sienna-400 focus:outline-none focus:ring-2 focus:ring-sienna-100"
        />
        {query && (
          <button onClick={() => setQuery("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-ink-faint hover:bg-cream hover:text-ink-muted">
            <X size={14} />
          </button>
        )}
      </div>

      <section>
        <h4 className="mb-2.5 text-[11px] font-bold uppercase tracking-widest text-ink-faint">Cuisine</h4>
        <div className="flex flex-wrap gap-1.5">
          {TOP_CUISINES.map((c) => {
            const active = selectedCuisines.includes(c);
            return (
              <button
                key={c}
                onClick={() => setSelectedCuisines((prev) => toggleInArray(prev, c))}
                className={`rounded-lg px-2.5 py-1.5 text-xs font-medium ring-1 transition-all ${
                  active
                    ? "bg-sienna-50 text-sienna-700 ring-sienna-200"
                    : "bg-paper text-ink-muted ring-cream-dark hover:bg-cream"
                }`}
              >
                {c}
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-[11px] text-ink-faint">Type any cuisine in the search bar to find more.</p>
      </section>

      <section>
        <h4 className="mb-2.5 text-[11px] font-bold uppercase tracking-widest text-ink-faint">Price</h4>
        <div className="flex gap-1.5">
          {PRICE_TIERS.map((t) => {
            const active = selectedPrices.includes(t.value);
            return (
              <button
                key={t.value}
                onClick={() => setSelectedPrices((prev) => toggleInArray(prev, t.value))}
                title={t.hint}
                className={`flex flex-1 flex-col items-center justify-center rounded-xl py-2 text-xs font-semibold ring-1 transition-all ${
                  active
                    ? "bg-sienna-50 text-sienna-700 ring-sienna-200"
                    : "bg-paper text-ink-muted ring-cream-dark hover:bg-cream"
                }`}
              >
                <span className="text-sm">{t.label}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section>
        <h4 className="mb-2.5 text-[11px] font-bold uppercase tracking-widest text-ink-faint">Diet</h4>
        <div className="flex flex-wrap gap-1.5">
          {DIETARY_OPTIONS.map((d) => {
            const active = selectedDietary.includes(d.value);
            return (
              <button
                key={d.value}
                onClick={() => setSelectedDietary((prev) => toggleInArray(prev, d.value))}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium ring-1 transition-all ${
                  active
                    ? "bg-sienna-50 text-sienna-700 ring-sienna-200"
                    : "bg-paper text-ink-muted ring-cream-dark hover:bg-cream"
                }`}
              >
                {d.icon}
                {d.label}
              </button>
            );
          })}
        </div>
      </section>

      <section>
        <h4 className="mb-2.5 text-[11px] font-bold uppercase tracking-widest text-ink-faint">Health</h4>
        <div className="flex flex-wrap gap-1.5">
          {HEALTH_PRESETS.map((h) => {
            const active = minHealthScore === h.value;
            return (
              <button
                key={h.value}
                onClick={() => setMinHealthScore(h.value)}
                className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium ring-1 transition-all ${
                  active
                    ? "bg-olive-50 text-olive-700 ring-olive-200"
                    : "bg-paper text-ink-muted ring-cream-dark hover:bg-cream"
                }`}
              >
                {h.value > 0 && <HeartPulse size={12} />}
                {h.label}
              </button>
            );
          })}
        </div>
      </section>

      {hasActiveFilters && (
        <button onClick={clearAllFilters} className="w-full rounded-xl py-2 text-xs font-semibold text-ink-faint transition hover:bg-cream hover:text-ink-muted">
          Clear all filters
        </button>
      )}
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-serif text-2xl text-ink">Search</h2>
          <p className="text-sm text-ink-faint mt-1">Find restaurants by name, cuisine, price, diet, or health score.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-sm text-ink-faint">{results.length} restaurant{results.length !== 1 ? "s" : ""}</div>
          <div className="relative">
            <ArrowDownUp size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-faint" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="appearance-none rounded-xl border border-cream-dark bg-paper py-2 pl-8 pr-7 text-xs font-medium text-ink-muted shadow-sm focus:border-sienna-400 focus:outline-none focus:ring-2 focus:ring-sienna-100"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <button
            onClick={() => setShowFiltersMobile((s) => !s)}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold shadow-sm ring-1 transition-all lg:hidden ${
              showFiltersMobile ? "bg-sienna-50 text-sienna-700 ring-sienna-200" : "bg-paper text-ink-muted ring-cream-dark"
            }`}
          >
            <SlidersHorizontal size={14} />
            Filters
            {activeFilters.length > 0 && (
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-sienna-500 text-[10px] font-bold text-white">
                {activeFilters.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {activeFilters.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {activeFilters.map((f) => (
            <span key={f.key} className="flex items-center gap-1 rounded-full bg-sienna-50 px-3 py-1 text-xs font-medium text-sienna-700 ring-1 ring-sienna-200">
              {f.label}
              <button onClick={f.onRemove} className="rounded-full p-0.5 hover:bg-sienna-100 transition">
                <X size={10} />
              </button>
            </span>
          ))}
          <button onClick={clearAllFilters} className="ml-1 text-xs font-medium text-ink-faint hover:text-ink-muted transition">
            Clear all
          </button>
        </div>
      )}

      <div className="flex gap-6">
        <aside className={`w-64 flex-shrink-0 ${showFiltersMobile ? "block" : "hidden lg:block"}`}>
          <div className="sticky top-28 rounded-2xl border border-cream-dark bg-paper p-4 shadow-card">
            <div className="mb-4 flex items-center justify-between lg:hidden">
              <h3 className="text-sm font-semibold text-ink">Filters</h3>
              <button onClick={() => setShowFiltersMobile(false)} className="rounded p-1 text-ink-faint hover:bg-cream hover:text-ink-muted">
                <X size={16} />
              </button>
            </div>
            {FilterRailContent}
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          {results.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-cream-dark py-20 text-center">
              <BookOpen size={40} className="mb-3 text-ink-faint" />
              <p className="font-serif text-lg text-ink-muted">No venues found</p>
              <p className="text-sm text-ink-faint mt-1 mb-5">
                {hasActiveFilters
                  ? "Try loosening your filters or clearing them entirely."
                  : "Try a different search term."}
              </p>
              {hasActiveFilters && (
                <button onClick={clearAllFilters} className="btn-primary gap-2">
                  <X size={14} /> Clear all filters
                </button>
              )}
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {results.map((venue) => (
                <VenueCard
                  key={venue.id}
                  venue={venue}
                  onAdd={() => setSelectedVenue(venue)}
                  onClick={() => setSelectedVenue(venue)}
                  compact
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {selectedVenue && (
        <VenueDetailModal
          venue={selectedVenue}
          open={!!selectedVenue}
          onClose={() => setSelectedVenue(null)}
          onAdd={(item) => {
            onProfileChange(addRankedItem(profile, item));
            setSelectedVenue(null);
          }}
        />
      )}
    </div>
  );
}
