import { useState } from "react";
import type { Venue, RankedItem } from "../data/types";
import { ALL_CUISINES } from "../data/mockData";

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (item: RankedItem) => void;
  initialVenue?: Venue;
}

export function AddVenueModal({ open, onClose, onSave, initialVenue }: Props) {
  const [name, setName] = useState(initialVenue?.name ?? "");
  const [cuisine, setCuisine] = useState(initialVenue?.cuisines[0] ?? "");
  const [price, setPrice] = useState<number | "">(initialVenue?.price_tier ?? "");
  const [occasion, setOccasion] = useState<RankedItem["occasion_tag"]>("solo");
  const [visited, setVisited] = useState(new Date().toISOString().slice(0, 10));
  const [classic, setClassic] = useState(false);

  if (!open) return null;

  const handleSave = () => {
    const venue: Venue = initialVenue ?? {
      id: `user_${Date.now()}`,
      name: name || "Unnamed Venue",
      location: null,
      cuisines: cuisine ? [cuisine] : [],
      dietary_tags: [],
      price_tier: typeof price === "number" ? price : null,
      health_score: null,
      source: "user_added",
    };
    const item: RankedItem = {
      venue,
      visited_at: `${visited}T12:00:00+00:00`,
      added_at: new Date().toISOString(),
      occasion_tag: occasion,
      is_classic: classic,
    };
    onSave(item);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-gray-900">
          {initialVenue ? "Add to your list" : "Add a new place"}
        </h2>
        <div className="mt-4 space-y-3">
          {!initialVenue && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700">Venue name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 bg-gray-50 px-3 py-2 text-sm shadow-sm focus:border-orange-500 focus:ring-orange-500"
                  placeholder="e.g. Ramen-Ya"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Cuisine</label>
                <select
                  value={cuisine}
                  onChange={(e) => setCuisine(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 bg-gray-50 px-3 py-2 text-sm shadow-sm"
                >
                  <option value="">Select cuisine</option>
                  {ALL_CUISINES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Price tier</label>
                <select
                  value={price}
                  onChange={(e) => setPrice(e.target.value ? Number(e.target.value) : "")}
                  className="mt-1 block w-full rounded-md border-gray-300 bg-gray-50 px-3 py-2 text-sm shadow-sm"
                >
                  <option value="">Unknown</option>
                  <option value={1}>$</option>
                  <option value={2}>$$</option>
                  <option value={3}>$$$</option>
                  <option value={4}>$$$$</option>
                </select>
              </div>
            </>
          )}
          {initialVenue && (
            <div className="rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-700">
              <strong>{initialVenue.name}</strong> · {initialVenue.cuisines.join(", ")}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700">Occasion</label>
            <select
              value={occasion}
              onChange={(e) => setOccasion(e.target.value as RankedItem["occasion_tag"])}
              className="mt-1 block w-full rounded-md border-gray-300 bg-gray-50 px-3 py-2 text-sm shadow-sm"
            >
              <option value="solo">Solo</option>
              <option value="date">Date</option>
              <option value="business">Business</option>
              <option value="group">Group</option>
              <option value="comfort">Comfort</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Visited on</label>
            <input
              type="date"
              value={visited}
              onChange={(e) => setVisited(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 bg-gray-50 px-3 py-2 text-sm shadow-sm"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={classic}
              onChange={(e) => setClassic(e.target.checked)}
              className="rounded border-gray-300 accent-orange-600"
            />
            Mark as classic (no time decay)
          </label>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
