import { useState, useMemo } from "react";
import type { Venue, TasteProfile, RankedItem } from "../data/types";
import type { FeedData } from "../data/types";
import { addRankedItem, removeRankedItem, createContext } from "../data/api";
import { getAllVenues } from "../data/venues";
import { VenueDetailModal } from "../components/VenueDetailModal";
import { VenueCard } from "../components/VenueCard";
import {
  ArrowLeft,
  MapPin,
  DollarSign,
  Star,
  Heart,
  ExternalLink,
  Trash2,
} from "lucide-react";
import { statusLabel, statusColor } from "../data/mockData";
import { useToast } from "../context/ToastContext";

interface Props {
  venue: Venue;
  profile: TasteProfile;
  feed: FeedData;
  onProfileChange: (p: TasteProfile) => void;
  onBack: () => void;
  onNavigateToProfile?: (userId: string, userName: string) => void;
}

export function VenuePage({
  venue,
  profile,
  feed,
  onProfileChange,
  onBack,
  onNavigateToProfile,
}: Props) {
  const [showAddModal, setShowAddModal] = useState(false);
  const toast = useToast();

  // Search across ALL contexts for this venue
  const existing = useMemo(() => {
    for (const ctx of Object.values(profile.contexts)) {
      const found = ctx.ranked_list.find((r) => r.venue.id === venue.id);
      if (found) return found;
    }
    return undefined;
  }, [profile, venue]);

  const venuePosts = useMemo(() => {
    return feed.posts.filter((p) => p.venue_id === venue.id).slice(0, 6);
  }, [feed, venue]);

  // Related venues: same cuisine(s) but not this one
  const related = useMemo(() => {
    const pool = getAllVenues().filter((v) => v.id !== venue.id);
    const scored = pool.map((v) => ({
      venue: v,
      score: v.cuisines.filter((c) => venue.cuisines.includes(c)).length,
    }));
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, 4).map((s) => s.venue);
  }, [venue]);

  const handleAdd = (item: RankedItem, contextId: string) => {
    let p = profile;
    // Create list if it doesn't exist yet
    if (!p.contexts[contextId]) {
      p = createContext(p, contextId);
    }
    // Remove first if already there so we replace with the latest visit
    p = removeRankedItem(p, venue.id, contextId);
    p = addRankedItem(p, item, undefined, contextId);
    onProfileChange(p);
    setShowAddModal(false);
  };

  const handleRemove = () => {
    let p = profile;
    for (const ctxId of Object.keys(profile.contexts)) {
      if (profile.contexts[ctxId].ranked_list.some((r) => r.venue.id === venue.id)) {
        p = removeRankedItem(p, venue.id, ctxId);
      }
    }
    onProfileChange(p);
    toast.show("Removed from library", "info");
  };

  const isInWishlist = existing?.status === "wishlist";

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Back button */}
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm font-medium text-ink-faint hover:text-sienna-600 transition"
      >
        <ArrowLeft size={15} /> Back
      </button>

      {/* Hero */}
      <div className="relative w-full overflow-hidden rounded-3xl bg-cream-dark shadow-card" style={{ aspectRatio: "2/1" }}>
        <img src={venue.image_url} alt={venue.name} className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        <div className="absolute bottom-5 left-5 right-5">
          <h1 className="font-serif text-3xl text-white drop-shadow">{venue.name}</h1>
          <p className="text-sm text-white/80 mt-1">{venue.cuisines.join(" · ")}</p>
        </div>
      </div>

      {/* Quick details */}
      <div className="flex flex-wrap gap-2">
        {venue.price_tier && (
          <span className="chip-active">
            <DollarSign size={10} className="mr-0.5" />
            {"$".repeat(venue.price_tier)}
          </span>
        )}
        {venue.dietary_tags.map((t) => (
          <span key={t} className="chip">{t}</span>
        ))}
        {venue.health_score !== null && (
          <span className="chip">Health {Math.round(venue.health_score * 100)}%</span>
        )}
        {venue.rating && (
          <span className="chip flex items-center gap-0.5">
            <Star size={10} className="text-amber-400" fill="currentColor" />
            {venue.rating}
          </span>
        )}
        {venue.location && (
          <span className="chip flex items-center gap-0.5">
            <MapPin size={10} />
            {venue.location.lat.toFixed(2)}, {venue.location.lng.toFixed(2)}
          </span>
        )}
      </div>

      {/* Action bar */}
      <div className="flex flex-wrap items-center gap-3">
        {existing ? (
          <>
            <span
              className={`rounded-xl px-4 py-2 text-sm font-medium ring-1 ${statusColor(
                existing.status
              )}`}
            >
              {existing.status === "wishlist"
                ? "In wishlist"
                : `Saved as ${statusLabel(existing.status)}`}
            </span>

            {isInWishlist ? (
              <>
                <button
                  onClick={handleRemove}
                  className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 transition"
                >
                  <Trash2 size={14} /> Remove
                </button>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="btn-primary gap-2"
                >
                  <Heart size={15} /> Log visit
                </button>
              </>
            ) : (
              <button
                onClick={() => setShowAddModal(true)}
                className="btn-primary gap-2"
              >
                <Heart size={15} /> Log another visit
              </button>
            )}
          </>
        ) : (
          <button onClick={() => setShowAddModal(true)} className="btn-primary gap-2">
            <Heart size={15} /> Add to library
          </button>
        )}

        {venue.source_url && (
          <a
            href={venue.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-ghost gap-1.5 text-sm"
            aria-label="Open source page"
          >
            <ExternalLink size={14} /> Open source
          </a>
        )}
      </div>

      {/* Posts about this venue */}
      {venuePosts.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-serif text-lg text-ink">Posts about {venue.name}</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {venuePosts.map((post) => (
              <div key={post.id} className="rounded-2xl border border-cream-dark bg-paper p-4 shadow-sm">
                <button
                  className="flex items-center gap-2 mb-2 text-left"
                  onClick={() => onNavigateToProfile?.(post.author_id, post.author_name)}
                >
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-cream text-xs font-bold text-ink-muted">
                    {post.author_name.split(" ")[0][0]}
                  </div>
                  <span className="text-xs font-medium text-ink">{post.author_name}</span>
                </button>
                <p className="text-sm text-ink-light leading-relaxed line-clamp-3">
                  "{post.text}"
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Related venues */}
      {related.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-serif text-lg text-ink">You might also like</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            {related.map((v) => (
              <VenueCard key={v.id} venue={v} compact onAdd={() => setShowAddModal(true)} />
            ))}
          </div>
        </div>
      )}

      {showAddModal && (
        <VenueDetailModal
          venue={venue}
          profile={profile}
          open={showAddModal}
          onClose={() => setShowAddModal(false)}
          onAdd={handleAdd}
          existingData={existing}
        />
      )}
    </div>
  );
}
