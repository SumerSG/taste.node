import { useMemo, useState } from "react";
import type { Venue, TasteProfile } from "../data/types";
import { ALL_VENUES, searchVenues } from "../data/mockData";
import { addRankedItem } from "../data/api";
import { VenueCard } from "../components/VenueCard";
import { VenueDetailModal } from "../components/VenueDetailModal";
import { Search, BookOpen, X } from "lucide-react";

interface Props {
  profile: TasteProfile;
  onProfileChange: (p: TasteProfile) => void;
  initialQuery?: string;
}

export function SearchView({ profile, onProfileChange, initialQuery = "" }: Props) {
  const [query, setQuery] = useState(initialQuery);
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);
  const [filterCuisine, setFilterCuisine] = useState<string>("");


  const cuisines = useMemo(() => Array.from(new Set(ALL_VENUES.flatMap((v) => v.cuisines))).sort(), []);

  const results = useMemo(() => {
    let pool = searchVenues(query);
    if (filterCuisine) pool = pool.filter((v) => v.cuisines.includes(filterCuisine));
    return pool;
  }, [query, filterCuisine]);

  const activeChips = [];
  if (query) activeChips.push({ label: `"${query}"`, key: "query" });
  if (filterCuisine) activeChips.push({ label: filterCuisine, key: "cuisine" });

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-surface-900">Search</h2>
          <p className="text-sm text-surface-500 mt-1">Find restaurants by name or cuisine. Click a card to view details and add to your ranking.</p>
        </div>
        <div className="text-sm text-surface-500">{results.length} restaurants</div>
      </div>

      {/* Search + cuisine filter */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-surface-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or cuisine..."
            className="w-full rounded-2xl border border-surface-200 bg-white py-2.5 pl-10 pr-4 text-sm shadow-sm transition focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          <button onClick={() => setFilterCuisine("")} className={`rounded-lg px-3 py-2 text-xs font-medium ring-1 transition ${!filterCuisine ? "bg-brand-50 text-brand-700 ring-brand-200" : "bg-white text-surface-600 ring-surface-200 hover:bg-surface-50"}`}>All</button>
          {cuisines.map((c) => (
            <button key={c} onClick={() => setFilterCuisine((f) => (f === c ? "" : c))} className={`rounded-lg px-3 py-2 text-xs font-medium ring-1 transition ${filterCuisine === c ? "bg-brand-50 text-brand-700 ring-brand-200" : "bg-white text-surface-600 ring-surface-200 hover:bg-surface-50"}`}>{c}</button>
          ))}
        </div>
      </div>

      {/* Active chips */}
      {activeChips.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {activeChips.map((chip) => (
            <span key={chip.key} className="flex items-center gap-1 rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700 ring-1 ring-brand-200">
              {chip.label}
              <button onClick={() => { if (chip.key === "query") setQuery(""); if (chip.key === "cuisine") setFilterCuisine(""); }} className="rounded-full hover:bg-brand-100"><X size={10} /></button>
            </span>
          ))}
        </div>
      )}

      {/* Grid */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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

      {results.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-surface-200 py-20 text-center">
          <BookOpen size={40} className="mb-3 text-surface-300" />
          <p className="text-lg font-semibold text-surface-600">No venues found</p>
          <p className="text-sm text-surface-400 mt-1">Try a different search term or cuisine filter.</p>
        </div>
      )}

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
