import { useState, useMemo } from "react";
import type { Venue, TasteProfile, RankedItem } from "../data/types";
import type { FeedData } from "../data/types";
import { addRankedItem } from "../data/api";
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
} from "lucide-react";

interface Props {
  venue: Venue;
  profile: TasteProfile;
  feed: FeedData;
  onProfileChange: (p: TasteProfile) => void;
  onBack: () => void;
  onNavigateToProfile?: (userId: string, userName: string) => void;
}

export function VenuePage({ venue, profile, feed, onProfileChange, onBack, onNavigateToProfile }: Props) {
  const [showAddModal, setShowAddModal] = useState(false);

  const existing = useMemo(() => {
    const ctx = profile.contexts[profile.default_context];
    return ctx?.ranked_list.find((r) => r.venue.id === venue.id);
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

  const handleAdd = (item: RankedItem) => {
    onProfileChange(addRankedItem(profile, item));
    setShowAddModal(false);
  };

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
        <img
          src={venue.image_url}
          alt={venue.name}
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        <div className="absolute bottom-5 left-5 right-5">
          <h1 className="font-serif text-3xl text-white drop-shadow">{venue.name}</h1>
          <p className="text-sm text-white/80 mt-1">
            {venue.cuisines.join(" · ")}
          </p>
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
      <div className="flex items-center gap-3">
        {existing ? (
          <>
            <span className="rounded-xl bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 ring-1 ring-emerald-200">
              Saved as {existing.status?.replace(/_/g, " ")}
            </span>
            <button
              onClick={() => setShowAddModal(true)}
              className="btn-ghost gap-1.5 text-sm text-sienna-600 hover:text-sienna-700"
            >
              <Heart size={15} /> Add another visit
            </button>
          </>
        ) : (
          <button
            onClick={() => setShowAddModal(true)}
            className="btn-primary gap-2"
          >
            <Heart size={15} /> Add to Library
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
              <div
                key={post.id}
                className="rounded-2xl border border-cream-dark bg-paper p-4 shadow-sm"
              >
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
                  “{post.text}”
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
          open={showAddModal}
          onClose={() => setShowAddModal(false)}
          onAdd={handleAdd}
          existingStatus={existing?.status}
        />
      )}
    </div>
  );
}
