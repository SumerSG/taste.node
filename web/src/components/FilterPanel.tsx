import { useState } from "react";
import type { Filters, RankStatus } from "../data/types";
import { TOP_CUISINES } from "../data/mockData";
import {
  X, SlidersHorizontal, Search, Leaf, Fish, Beef,
  HeartPulse, ChevronDown, ChevronUp, Star, MessageSquare,
} from "lucide-react";

interface Props {
  filters: Filters;
  onChange: (f: Filters) => void;
  open: boolean;
  onClose: () => void;
}

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
  { value: "vegan", label: "Vegan", icon: <Leaf size={13} /> },
];

const HEALTH_PRESETS = [
  { value: 0, label: "Any" },
  { value: 0.5, label: "Healthy" },
  { value: 0.7, label: "Very healthy" },
  { value: 0.8, label: "Super healthy" },
];

const SORT_OPTIONS = [
  { value: "relevance", label: "Relevance" },
  { value: "name", label: "Name" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
  { value: "health_desc", label: "Healthiest First" },
  { value: "distance", label: "Nearest First" },
  { value: "rating_desc", label: "Highest Rated" },
  { value: "review_count_desc", label: "Most Reviewed" },
];

const VISIT_STATUS_OPTIONS: { value: RankStatus | "any"; label: string }[] = [
  { value: "any", label: "Any" },
  { value: "want_to_try", label: "Want to try" },
  { value: "visited", label: "Visited" },
  { value: "favourite", label: "Favourite" },
  { value: "regular", label: "Regular" },
];

const REVIEW_COUNT_PRESETS = [
  { value: 0, label: "Any" },
  { value: 50, label: "50+" },
  { value: 100, label: "100+" },
  { value: 500, label: "500+" },
  { value: 1000, label: "1000+" },
];


export function FilterPanel({ filters, onChange, open, onClose }: Props) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const update = (patch: Partial<Filters>) => {
    onChange({ ...filters, ...patch });
  };

  const clearAll = () => {
    onChange({
      query: "",
      cuisine: "",
      diet: "",
      price_tier: null,
      healthiness_min: 0,
      radius_km: 50,
      rating_min: 0,
      review_count_min: 0,
      visit_status: "any",
      sort_by: "relevance",
      with_user: "",
    });
  };

  const activeCount = [
    filters.query,
    filters.cuisine,
    filters.diet,
    filters.price_tier !== null,
    filters.healthiness_min > 0,
    filters.radius_km < 50,
    filters.rating_min > 0,
    filters.review_count_min > 0,
    filters.visit_status !== "any",
    filters.sort_by !== "relevance",
  ].filter(Boolean).length;

  const panelContent = (
    <div className="space-y-6">
      {/* Search */}
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
        <input
          value={filters.query}
          onChange={(e) => update({ query: e.target.value })}
          placeholder="Search name or cuisine..."
          className="w-full rounded-xl border border-cream-dark bg-cream py-2 pl-9 pr-8 text-sm shadow-sm transition focus:border-sienna-400 focus:outline-none focus:ring-2 focus:ring-sienna-100"
        />
        {filters.query && (
          <button onClick={() => update({ query: "" })} className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-ink-faint hover:bg-cream-warm hover:text-ink-muted">
            <X size={12} />
          </button>
        )}
      </div>

      {/* Sort */}
      <section>
        <h4 className="mb-2 text-[11px] font-bold uppercase tracking-widest text-ink-faint">Sort</h4>
        <select
          value={filters.sort_by}
          onChange={(e) => update({ sort_by: e.target.value })}
          className="w-full appearance-none rounded-xl border border-cream-dark bg-cream px-3 py-2 text-sm text-ink-muted shadow-sm focus:border-sienna-400 focus:outline-none focus:ring-2 focus:ring-sienna-100"
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </section>

      {/* Cuisine */}
      <section>
        <h4 className="mb-2 text-[11px] font-bold uppercase tracking-widest text-ink-faint">Cuisine</h4>
        <div className="flex flex-wrap gap-1.5">
          {TOP_CUISINES.map((c) => {
            const active = filters.cuisine === c;
            return (
              <button
                key={c}
                onClick={() => update({ cuisine: active ? "" : c })}
                className={`rounded-lg px-2.5 py-1.5 text-xs font-medium ring-1 transition-all ${
                  active
                    ? "bg-sienna-50 text-sienna-700 ring-sienna-200"
                    : "bg-cream text-ink-muted ring-cream-dark hover:bg-cream-warm"
                }`}
              >
                {c}
              </button>
            );
          })}
        </div>
      </section>

      {/* Price */}
      <section>
        <h4 className="mb-2 text-[11px] font-bold uppercase tracking-widest text-ink-faint">Price</h4>
        <div className="flex gap-1.5">
          {PRICE_TIERS.map((t) => {
            const active = filters.price_tier === t.value;
            return (
              <button
                key={t.value}
                onClick={() => update({ price_tier: active ? null : t.value })}
                title={t.hint}
                className={`flex flex-1 flex-col items-center justify-center rounded-xl py-2 text-xs font-semibold ring-1 transition-all ${
                  active
                    ? "bg-sienna-50 text-sienna-700 ring-sienna-200"
                    : "bg-cream text-ink-muted ring-cream-dark hover:bg-cream-warm"
                }`}
              >
                <span className="text-sm">{t.label}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Diet */}
      <section>
        <h4 className="mb-2 text-[11px] font-bold uppercase tracking-widest text-ink-faint">Diet</h4>
        <div className="flex flex-wrap gap-1.5">
          {DIETARY_OPTIONS.map((d) => {
            const active = filters.diet === d.value;
            return (
              <button
                key={d.value}
                onClick={() => update({ diet: active ? "" : d.value })}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium ring-1 transition-all ${
                  active
                    ? "bg-sienna-50 text-sienna-700 ring-sienna-200"
                    : "bg-cream text-ink-muted ring-cream-dark hover:bg-cream-warm"
                }`}
              >
                {d.icon}
                {d.label}
              </button>
            );
          })}
        </div>
      </section>

      {/* Health */}
      <section>
        <h4 className="mb-2 text-[11px] font-bold uppercase tracking-widest text-ink-faint">Health</h4>
        <div className="flex flex-wrap gap-1.5">
          {HEALTH_PRESETS.map((h) => {
            const active = filters.healthiness_min === h.value;
            return (
              <button
                key={h.value}
                onClick={() => update({ healthiness_min: h.value })}
                className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium ring-1 transition-all ${
                  active
                    ? "bg-olive-50 text-olive-700 ring-olive-200"
                    : "bg-cream text-ink-muted ring-cream-dark hover:bg-cream-warm"
                }`}
              >
                {h.value > 0 && <HeartPulse size={12} />}
                {h.label}
              </button>
            );
          })}
        </div>
      </section>

      {/* ── Advanced filters accordion ── */}
      <div className="border-t border-cream-dark pt-4">
        <button
          onClick={() => setShowAdvanced((s) => !s)}
          className="flex w-full items-center justify-between text-sm font-semibold text-ink-muted transition hover:text-ink"
        >
          <span className="flex items-center gap-1.5">
            <SlidersHorizontal size={14} />
            Advanced
          </span>
          {showAdvanced ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>

        {showAdvanced && (
          <div className="mt-4 space-y-5">
            {/* Radius */}
            <section>
              <div className="mb-1.5 flex items-center justify-between">
                <h4 className="text-[11px] font-bold uppercase tracking-widest text-ink-faint">Max distance</h4>
                <span className="text-xs font-medium text-ink-muted">{filters.radius_km} km</span>
              </div>
              <input
                type="range"
                min={0.5}
                max={20}
                step={0.5}
                value={filters.radius_km}
                onChange={(e) => update({ radius_km: parseFloat(e.target.value) })}
                className="w-full accent-sienna-500"
              />
              <div className="flex justify-between text-[10px] text-ink-faint">
                <span>0.5 km</span>
                <span>20 km</span>
              </div>
            </section>

            {/* Rating min */}
            <section>
              <div className="mb-1.5 flex items-center justify-between">
                <h4 className="text-[11px] font-bold uppercase tracking-widest text-ink-faint">Min rating</h4>
                <span className="flex items-center gap-1 text-xs font-medium text-ink-muted">
                  <Star size={11} className="text-amber-400" fill="currentColor" />
                  {filters.rating_min.toFixed(1)}+
                </span>
              </div>
              <input
                type="range"
                min={3.0}
                max={5.0}
                step={0.1}
                value={filters.rating_min}
                onChange={(e) => update({ rating_min: parseFloat(e.target.value) })}
                className="w-full accent-sienna-500"
              />
              <div className="flex justify-between text-[10px] text-ink-faint">
                <span>3.0</span>
                <span>5.0</span>
              </div>
            </section>

            {/* Review count */}
            <section>
              <h4 className="mb-2 text-[11px] font-bold uppercase tracking-widest text-ink-faint">Min reviews</h4>
              <div className="flex flex-wrap gap-1.5">
                {REVIEW_COUNT_PRESETS.map((r) => {
                  const active = filters.review_count_min === r.value;
                  return (
                    <button
                      key={r.value}
                      onClick={() => update({ review_count_min: r.value })}
                      className={`rounded-lg px-2.5 py-1 text-xs font-medium ring-1 transition-all ${
                        active
                          ? "bg-sienna-50 text-sienna-700 ring-sienna-200"
                          : "bg-cream text-ink-muted ring-cream-dark hover:bg-cream-warm"
                      }`}
                    >
                      {r.label}
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Visit status */}
            <section>
              <h4 className="mb-2 text-[11px] font-bold uppercase tracking-widest text-ink-faint">In your library</h4>
              <div className="flex flex-wrap gap-1.5">
                {VISIT_STATUS_OPTIONS.map((s) => {
                  const active = filters.visit_status === s.value;
                  return (
                    <button
                      key={s.value}
                      onClick={() => update({ visit_status: s.value })}
                      className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium ring-1 transition-all ${
                        active
                          ? "bg-sienna-50 text-sienna-700 ring-sienna-200"
                          : "bg-cream text-ink-muted ring-cream-dark hover:bg-cream-warm"
                      }`}
                    >
                      {s.value !== "any" && <MessageSquare size={11} />}
                      {s.label}
                    </button>
                  );
                })}
              </div>
            </section>
          </div>
        )}
      </div>

      {/* Clear all */}
      {activeCount > 0 && (
        <button
          onClick={clearAll}
          className="w-full rounded-xl border border-cream-dark py-2 text-xs font-semibold text-ink-faint transition hover:bg-cream hover:text-ink-muted"
        >
          Clear all filters ({activeCount})
        </button>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop: collapsible sidebar */}
      <aside
        className={`hidden h-full flex-shrink-0 overflow-y-auto border-l border-cream-dark bg-paper transition-all duration-300 ease-card lg:block ${
          open ? "w-[280px] opacity-100" : "w-0 opacity-0"
        }`}
      >
        {open && (
          <div className="w-[280px] p-4">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-ink">Filters</h3>
              {activeCount > 0 && (
                <span className="flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-sienna-500 px-1.5 text-[10px] font-bold text-white">
                  {activeCount}
                </span>
              )}
            </div>
            {panelContent}
          </div>
        )}
      </aside>

      {/* Mobile: overlay drawer from right */}
      <div
        className={`fixed inset-0 z-50 lg:hidden ${open ? "pointer-events-auto" : "pointer-events-none"}`}
      >
        <div
          className={`absolute inset-0 bg-black/30 backdrop-blur-sm transition-opacity ${open ? "opacity-100" : "opacity-0"}`}
          onClick={onClose}
        />
        <div
          className={`absolute right-0 top-0 h-full w-[300px] transform overflow-y-auto bg-paper shadow-elevated transition-transform ${
            open ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <div className="flex items-center justify-between border-b border-cream-dark p-4">
            <h3 className="text-sm font-semibold text-ink">Filters</h3>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-ink-faint transition hover:bg-cream hover:text-ink-muted"
            >
              <X size={16} />
            </button>
          </div>
          <div className="p-4">{panelContent}</div>
        </div>
      </div>
    </>
  );
}
