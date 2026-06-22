import type { Recommendation, Venue } from "../data/types";
import { Plus } from "lucide-react";

interface Props {
  recs: Recommendation[];
  onAdd: (venue: Venue) => void;
}

function dollars(n: number | null) {
  if (n == null) return "?";
  return "$".repeat(n);
}

export function RecommendationsFeed({ recs, onAdd }: Props) {
  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold text-gray-900">Recommendations</h2>
      {recs.length === 0 && (
        <div className="rounded-lg border-2 border-dashed border-gray-200 p-8 text-center text-gray-500">
          No recommendations match your filters. Try broadening them.
        </div>
      )}
      <div className="grid gap-3">
        {recs.map((rec) => (
          <div key={rec.venue.id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <h3 className="text-base font-semibold text-gray-900">{rec.venue.name}</h3>
                <div className="mt-1 flex flex-wrap gap-1">
                  {rec.venue.cuisines.map((c) => (
                    <span key={c} className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                      {c}
                    </span>
                  ))}
                </div>
              </div>
              <div className="shrink-0 rounded-full bg-orange-100 px-3 py-1 text-sm font-bold text-orange-700">
                {Math.round(rec.score * 100)}%
              </div>
            </div>
            <p className="mt-3 text-sm italic text-gray-700">“{rec.explanation}”</p>
            <div className="mt-3 flex items-center justify-between">
              <div className="text-xs text-gray-500">
                {dollars(rec.venue.price_tier)} · Health {Math.round((rec.venue.health_score ?? 0) * 100)}%
              </div>
              <button
                onClick={() => onAdd(rec.venue)}
                className="flex items-center gap-1 rounded-lg bg-orange-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-orange-700"
              >
                <Plus size={14} /> Add to list
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
