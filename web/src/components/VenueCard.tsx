import type { Venue } from "../data/types";
import { MapPin, Heart, TrendingUp } from "lucide-react";

interface Props {
  venue: Venue;
  score?: number;
  explanation?: string;
  distance?: number;
  onAdd?: () => void;
  onClick?: () => void;
  compact?: boolean;
}

function tierLabel(n: number | null) {
  if (!n) return "-";
  return "$".repeat(n);
}

function tierBadge(n: number | null) {
  if (!n) return "bg-surface-100 text-surface-500";
  const colors = ["bg-emerald-50 text-emerald-700", "bg-blue-50 text-blue-700", "bg-violet-50 text-violet-700", "bg-rose-50 text-rose-700"];
  return colors[Math.min(n - 1, 3)];
}

export function VenueCard({ venue, score, explanation, distance, onAdd, onClick, compact }: Props) {
  if (compact) {
    return (
      <div className="card group cursor-pointer overflow-hidden" onClick={onClick}>
        <div className="relative aspect-[4/3] overflow-hidden">
          <img src={venue.image_url} alt={venue.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          <div className="absolute bottom-3 left-3 right-3">
            <h3 className="text-base font-bold text-white drop-shadow">{venue.name}</h3>
            <div className="mt-1 flex flex-wrap gap-1">
              {venue.cuisines.slice(0, 2).map((c) => (
                <span key={c} className="rounded bg-white/20 px-1.5 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm">{c}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card group flex flex-col gap-3 overflow-hidden p-0">
      {/* Image */}
      <div className="relative aspect-[16/10] overflow-hidden cursor-pointer" onClick={onClick}>
        <img src={venue.image_url} alt={venue.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
        {/* Badges */}
        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          {venue.price_tier && (
            <span className={`rounded-lg px-2 py-0.5 text-xs font-bold ${tierBadge(venue.price_tier)}`}>{tierLabel(venue.price_tier)}</span>
          )}
          {(venue.health_score ?? 0) >= 0.8 && (
            <span className="flex items-center gap-1 rounded-lg bg-emerald-500/90 px-2 py-0.5 text-xs font-bold text-white backdrop-blur-sm">
              <TrendingUp size={11} /> Healthy {Math.round((venue.health_score ?? 0) * 100)}%
            </span>
          )}
        </div>
        {/* Score badge */}
        {score !== undefined && (
          <div className="absolute right-3 top-3 rounded-full bg-brand-600 px-2.5 py-1 text-xs font-bold text-white shadow-md">
            {Math.round(score * 100)}% match
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col gap-2 px-4 pb-4 pt-1">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="text-lg font-bold text-surface-900">{venue.name}</h3>
            <p className="text-sm text-surface-500">{venue.cuisines.join(" · ")}</p>
          </div>
        </div>

        {/* Dietary tags */}
        {venue.dietary_tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {venue.dietary_tags.map((tag) => (
              <span key={tag} className="chip">{tag}</span>
            ))}
          </div>
        )}

        {/* Meta */}
        <div className="flex items-center gap-3 text-xs text-surface-400">
          {venue.location && (
            <span className="flex items-center gap-1">
              <MapPin size={11} /> {distance?.toFixed(1) ?? "?"} km
            </span>
          )}
          {venue.health_score !== null && (
            <span>Health {Math.round(venue.health_score * 100)}%</span>
          )}
        </div>

        {/* Explanation */}
        {explanation && (
          <p className="mt-1 text-sm italic text-surface-600">“{explanation}”</p>
        )}

        {/* Action */}
        {onAdd && (
          <button onClick={onAdd} className="btn-primary mt-1 w-full gap-2">
            <Heart size={15} /> Add to My Ranking
          </button>
        )}
      </div>
    </div>
  );
}
