import { useMemo, useState } from "react";
import type { TasteProfile, Filters, Venue } from "../data/types";
import { getSortedRecommendations, addRankedItem } from "../data/api";
import { VenueCard } from "../components/VenueCard";
import { VenueDetailModal } from "../components/VenueDetailModal";
import { parseChatQuery } from "../utils/chatParser";
import { ALL_CUISINES } from "../data/mockData";
import { Search, SlidersHorizontal, X, ChevronDown, MapPin, TrendingUp } from "lucide-react";

interface Props {
  profile: TasteProfile;
  onProfileChange: (p: TasteProfile) => void;
}

const DEFAULT_FILTERS: Filters = {
  cuisine: "",
  diet: "",
  price_tier: null,
  healthiness_min: 0,
  radius_km: 10,
};

export function DiscoverView({ profile, onProfileChange }: Props) {
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [sortBy, setSortBy] = useState<string>("match");
  const [chatText, setChatText] = useState("");
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);
  const [railOpen, setRailOpen] = useState(true);

  const recs = useMemo(() => getSortedRecommendations(profile, filters, sortBy), [profile, filters, sortBy]);

  const activeFilterTags = useMemo(() => {
    const tags: { label: string; key: string }[] = [];
    if (filters.cuisine) tags.push({ label: filters.cuisine, key: "cuisine" });
    if (filters.diet) tags.push({ label: filters.diet, key: "diet" });
    if (filters.price_tier) tags.push({ label: "$".repeat(filters.price_tier), key: "price_tier" });
    if (filters.healthiness_min > 0) tags.push({ label: `Health ≥ ${Math.round(filters.healthiness_min * 100)}%`, key: "health" });
    if (filters.radius_km !== 10) tags.push({ label: `≤ ${filters.radius_km} km`, key: "radius" });
    return tags;
  }, [filters]);

  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatText.trim()) return;
    const parsed = parseChatQuery(chatText);
    setFilters(() => ({ ...DEFAULT_FILTERS, ...parsed.filters }));
    setChatText("");
  };

  const clearFilter = (key: string) => {
    setFilters((f) => {
      const next = { ...f };
      if (key === "cuisine") next.cuisine = "";
      if (key === "diet") next.diet = "";
      if (key === "price_tier") next.price_tier = null;
      if (key === "health") next.healthiness_min = 0;
      if (key === "radius") next.radius_km = 10;
      return next;
    });
  };

  const clearAll = () => {
    setFilters(DEFAULT_FILTERS);
  };

  return (
    <div className="flex gap-6">
      {/* Left filter rail */}
      <aside className={`shrink-0 transition-all duration-300 ${railOpen ? "w-64" : "w-0 overflow-hidden opacity-0"}`}>
        <div className="sticky top-24 space-y-5 rounded-2xl bg-white p-5 shadow-card ring-1 ring-surface-100">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-surface-500">Filters</h2>
            <button onClick={clearAll} className="text-xs font-medium text-brand-600 hover:text-brand-700">Reset</button>
          </div>

          {/* Cuisine */}
          <div>
            <label className="mb-2 block text-sm font-semibold text-surface-800">Cuisine</label>
            <div className="flex flex-wrap gap-1.5">
              <button onClick={() => setFilters((f) => ({ ...f, cuisine: "" }))} className={`rounded-lg px-2.5 py-1 text-xs font-medium ring-1 transition ${!filters.cuisine ? "bg-brand-50 text-brand-700 ring-brand-200" : "bg-white text-surface-600 ring-surface-200 hover:bg-surface-50"}`}>Any</button>
              {ALL_CUISINES.map((c) => (
                <button key={c} onClick={() => setFilters((f) => ({ ...f, cuisine: f.cuisine === c ? "" : c }))} className={`rounded-lg px-2.5 py-1 text-xs font-medium ring-1 transition ${filters.cuisine === c ? "bg-brand-50 text-brand-700 ring-brand-200" : "bg-white text-surface-600 ring-surface-200 hover:bg-surface-50"}`}>{c}</button>
              ))}
            </div>
          </div>

          {/* Diet */}
          <div>
            <label className="mb-2 block text-sm font-semibold text-surface-800">Diet</label>
            <select value={filters.diet} onChange={(e) => setFilters((f) => ({ ...f, diet: e.target.value }))} className="w-full rounded-xl border-surface-200 bg-surface-50 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:ring-brand-500">
              <option value="">Any</option>
              <option value="meat">Meat-friendly</option>
              <option value="fish">Pescatarian</option>
              <option value="veg">Vegetarian</option>
              <option value="vegan">Vegan</option>
            </select>
          </div>

          {/* Price */}
          <div>
            <label className="mb-2 block text-sm font-semibold text-surface-800">Price</label>
            <div className="flex gap-1.5">
              {[1,2,3,4].map((n) => (
                <button key={n} onClick={() => setFilters((f) => ({ ...f, price_tier: f.price_tier === n ? null : n }))} className={`flex-1 rounded-lg py-2 text-center text-xs font-bold ring-1 transition ${filters.price_tier === n ? "bg-brand-50 text-brand-700 ring-brand-200" : "bg-white text-surface-500 ring-surface-200 hover:bg-surface-50"}`}>{"$".repeat(n)}</button>
              ))}
            </div>
          </div>

          {/* Health */}
          <div>
            <label className="mb-2 block text-sm font-semibold text-surface-800">Min Healthiness</label>
            <input type="range" min={0} max={1} step={0.05} value={filters.healthiness_min} onChange={(e) => setFilters((f) => ({ ...f, healthiness_min: Number(e.target.value) }))} className="w-full accent-brand-600" />
            <div className="mt-1 text-xs text-surface-500">{Math.round(filters.healthiness_min * 100)}%</div>
          </div>

          {/* Radius */}
          <div>
            <label className="mb-2 block text-sm font-semibold text-surface-800">Radius</label>
            <input type="range" min={1} max={50} step={1} value={filters.radius_km} onChange={(e) => setFilters((f) => ({ ...f, radius_km: Number(e.target.value) }))} className="w-full accent-brand-600" />
            <div className="mt-1 flex items-center gap-1 text-xs text-surface-500"><MapPin size={10} /> {filters.radius_km} km</div>
          </div>
        </div>
      </aside>

      {/* Main results */}
      <div className="min-w-0 flex-1">
        {/* Chat bar */}
        <form onSubmit={handleChatSubmit} className="mb-5">
          <div className="relative">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-surface-400" />
            <input
              value={chatText}
              onChange={(e) => setChatText(e.target.value)}
              placeholder='Try: "vegan-friendly Italian under $$, healthy, near Shibuya"'
              className="w-full rounded-2xl border border-surface-200 bg-white py-3.5 pl-11 pr-4 text-sm shadow-sm transition focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
            />
          </div>
        </form>

        {/* Toolbar */}
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <button onClick={() => setRailOpen((s) => !s)} className="btn-secondary gap-1.5 text-xs">
            <SlidersHorizontal size={13} /> {railOpen ? "Hide" : "Show"} Filters
          </button>

          {activeFilterTags.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              {activeFilterTags.map((tag) => (
                <span key={tag.key} className="flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700 ring-1 ring-brand-200">
                  {tag.label}
                  <button onClick={() => clearFilter(tag.key)} className="rounded-full hover:bg-brand-100"><X size={11} /></button>
                </span>
              ))}
              <button onClick={clearAll} className="text-xs font-medium text-surface-400 hover:text-surface-600">Clear all</button>
            </div>
          )}

          <div className="ml-auto flex items-center gap-3">
            <span className="text-xs font-medium text-surface-500">{recs.length} found</span>
            <div className="relative">
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="appearance-none rounded-xl border-surface-200 bg-white py-1.5 pl-3 pr-8 text-xs font-medium text-surface-600 shadow-sm ring-1 ring-surface-200 focus:border-brand-500 focus:ring-brand-500">
                <option value="match">Best match</option>
                <option value="price_asc">Price: low to high</option>
                <option value="price_desc">Price: high to low</option>
                <option value="health_desc">Healthiest first</option>
                <option value="distance">Nearest first</option>
              </select>
              <ChevronDown size={12} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-surface-400" />
            </div>
          </div>
        </div>

        {/* Results */}
        {recs.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-surface-200 py-20 text-center">
            <TrendingUp size={40} className="mb-3 text-surface-300" />
            <p className="text-lg font-semibold text-surface-600">No matches found</p>
            <p className="text-sm text-surface-400 mt-1">Try broadening your filters or chat query.</p>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {recs.map((rec) => (
              <VenueCard
                key={rec.venue.id}
                venue={rec.venue}
                score={rec.score}
                explanation={rec.explanation}
                onAdd={() => setSelectedVenue(rec.venue)}
                onClick={() => setSelectedVenue(rec.venue)}
              />
            ))}
          </div>
        )}
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
