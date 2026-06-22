import { useState } from "react";
import type { Filters } from "../data/types";
import { ALL_CUISINES } from "../data/mockData";
import { SlidersHorizontal } from "lucide-react";

interface Props {
  filters: Filters;
  onChange: (f: Filters) => void;
}

export function FiltersPanel({ filters, onChange }: Props) {
  const [open, setOpen] = useState(true);

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-left font-medium text-gray-900"
      >
        <span className="flex items-center gap-2">
          <SlidersHorizontal size={16} />
          Live Filters
        </span>
        <span className="text-sm text-gray-500">{open ? "Hide" : "Show"}</span>
      </button>
      {open && (
        <div className="space-y-4 border-t border-gray-100 px-4 py-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Cuisine</label>
            <select
              value={filters.cuisine}
              onChange={(e) => onChange({ ...filters, cuisine: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 bg-gray-50 px-3 py-2 text-sm shadow-sm focus:border-orange-500 focus:ring-orange-500"
            >
              <option value="">Any</option>
              {ALL_CUISINES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Dietary style</label>
            <select
              value={filters.diet}
              onChange={(e) => onChange({ ...filters, diet: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 bg-gray-50 px-3 py-2 text-sm shadow-sm focus:border-orange-500 focus:ring-orange-500"
            >
              <option value="">Any</option>
              <option value="meat">Meat-friendly</option>
              <option value="fish">Pescatarian</option>
              <option value="veg">Vegetarian</option>
              <option value="vegan">Vegan</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Price tier</label>
            <select
              value={filters.price_tier ?? ""}
              onChange={(e) =>
                onChange({ ...filters, price_tier: e.target.value ? Number(e.target.value) : null })
              }
              className="mt-1 block w-full rounded-md border-gray-300 bg-gray-50 px-3 py-2 text-sm shadow-sm focus:border-orange-500 focus:ring-orange-500"
            >
              <option value="">Any</option>
              <option value={1}>$ — Budget</option>
              <option value={2}>$$ — Moderate</option>
              <option value={3}>$$$ — Expensive</option>
              <option value={4}>$$$$ — Very expensive</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Min healthiness</label>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={filters.healthiness_min}
              onChange={(e) => onChange({ ...filters, healthiness_min: Number(e.target.value) })}
              className="mt-1 w-full accent-orange-600"
            />
            <div className="text-xs text-gray-500">{Math.round(filters.healthiness_min * 100)}%</div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Radius (km)</label>
            <input
              type="range"
              min={1}
              max={50}
              step={1}
              value={filters.radius_km}
              onChange={(e) => onChange({ ...filters, radius_km: Number(e.target.value) })}
              className="mt-1 w-full accent-orange-600"
            />
            <div className="text-xs text-gray-500">{filters.radius_km} km</div>
          </div>
        </div>
      )}
    </div>
  );
}
