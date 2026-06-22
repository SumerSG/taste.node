import { useState } from "react";
import type { Venue, RankedItem, RankStatus } from "../data/types";
import { X, MapPin, Heart, Calendar, Tag } from "lucide-react";
import { statusLabel, statusColor } from "../data/mockData";

interface Props {
  venue: Venue;
  open: boolean;
  onClose: () => void;
  onAdd: (item: RankedItem) => void;
  existingStatus?: RankStatus;
}

export function VenueDetailModal({ venue, open, onClose, onAdd, existingStatus }: Props) {
  const [occasion, setOccasion] = useState<RankedItem["occasion_tag"]>("solo");
  const [visited, setVisited] = useState(new Date().toISOString().slice(0, 10));
  const [classic, setClassic] = useState(false);
  const [status, setStatus] = useState<RankStatus>(existingStatus ?? "want_to_try");

  if (!open) return null;

  const handleAdd = () => {
    const item: RankedItem = {
      venue,
      visited_at: `${visited}T12:00:00+00:00`,
      added_at: new Date().toISOString(),
      occasion_tag: occasion,
      is_classic: classic,
      status,
    };
    onAdd(item);
    onClose();
  };

  const statusOptions: RankStatus[] = ["want_to_try", "visited", "favourite", "regular"];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl bg-white shadow-elevated">
        {/* Image */}
        <div className="relative aspect-video shrink-0">
          <img src={venue.image_url} alt={venue.name} className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          <button onClick={onClose} className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur-md transition hover:bg-black/50">
            <X size={16} />
          </button>
          <div className="absolute bottom-4 left-4">
            <h2 className="text-2xl font-bold text-white drop-shadow">{venue.name}</h2>
            <p className="text-sm text-white/80">{venue.cuisines.join(" · ")}</p>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {/* Chips */}
          <div className="flex flex-wrap gap-2">
            {venue.price_tier && (
              <span className="chip-active">{"$".repeat(venue.price_tier)}</span>
            )}
            {venue.dietary_tags.map((t) => (
              <span key={t} className="chip">{t}</span>
            ))}
            {venue.health_score !== null && (
              <span className="chip">Health {Math.round(venue.health_score * 100)}%</span>
            )}
            {venue.location && (
              <span className="chip"><MapPin size={10} className="mr-1" /> {venue.location.lat.toFixed(2)},{venue.location.lng.toFixed(2)}</span>
            )}
          </div>

          {/* Add to list form */}
          <div className="mt-5 space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-surface-400">Add to your ranking</h3>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-surface-700">Status</label>
                <div className="flex flex-wrap gap-1.5">
                  {statusOptions.map((s) => (
                    <button
                      key={s}
                      onClick={() => setStatus(s)}
                      className={`rounded-lg px-2.5 py-1 text-xs font-medium ring-1 transition ${
                        status === s ? statusColor(s) : "bg-white text-surface-500 ring-surface-200 hover:bg-surface-50"
                      }`}
                    >
                      {statusLabel(s)}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-surface-700">Occasion</label>
                <select value={occasion} onChange={(e) => setOccasion(e.target.value as RankedItem["occasion_tag"])} className="w-full rounded-xl border-surface-200 bg-surface-50 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:ring-brand-500">
                  {["solo","date","business","group","comfort"].map((o) => (
                    <option key={o} value={o}>{o.charAt(0).toUpperCase() + o.slice(1)}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-surface-700 flex items-center gap-1"><Calendar size={12}/> Visited on</label>
                <input type="date" value={visited} onChange={(e) => setVisited(e.target.value)} className="w-full rounded-xl border-surface-200 bg-surface-50 px-3 py-2 text-sm shadow-sm" />
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 text-sm text-surface-700 cursor-pointer rounded-xl border border-surface-200 bg-surface-50 px-3 py-2 w-full">
                  <input type="checkbox" checked={classic} onChange={(e) => setClassic(e.target.checked)} className="rounded border-surface-300 accent-brand-600" />
                  <Tag size={13} /> Classic
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 border-t border-surface-100 p-4">
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button onClick={handleAdd} className="btn-primary flex-1 gap-2"><Heart size={15}/> Save</button>
        </div>
      </div>
    </div>
  );
}
