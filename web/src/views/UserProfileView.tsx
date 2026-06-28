import { useState, useMemo, useEffect } from "react";
import type { TasteProfile } from "../data/types";
import { getSampleUserProfile, getFollowers, SAMPLE_USERS } from "../data/mockData";
import { loadProfileBackend, hasBackend } from "../data/backendApi";
import { Star, UserCircle, ListOrdered, Users, Heart } from "lucide-react";

interface Props {
  userId: string;
  userName: string;
  onNavigateToVenue: (venue: TasteProfile["contexts"][string]["ranked_list"][number]["venue"]) => void;
  onNavigateToProfile: (userId: string) => void;
  onBack: () => void;
}

export function UserProfileView({ userId, userName, onNavigateToVenue, onNavigateToProfile, onBack }: Props) {
  const [profile, setProfile] = useState<TasteProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showFollowing, setShowFollowing] = useState(false);
  const [showFollowers, setShowFollowers] = useState(false);
  const [showRanked, setShowRanked] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        if (hasBackend()) {
          const remote = await loadProfileBackend(userId);
          if (remote && !cancelled) {
            setProfile(remote);
            setLoading(false);
            return;
          }
        }
        if (!cancelled) {
          setProfile(getSampleUserProfile(userId));
          setLoading(false);
        }
      } catch (err) {
        console.error("[UserProfileView] load error:", err);
        if (!cancelled) {
          setProfile(getSampleUserProfile(userId));
          setLoading(false);
        }
      }
    }
    load();
    return () => { cancelled = true; };
  }, [userId]);

  // All derived data here — useMemo hooks must be before any early return
  const followingUsers = useMemo(() => {
    if (!profile) return [];
    return profile.following
      .map((id) => SAMPLE_USERS.find((u) => u.id === id))
      .filter(Boolean) as { id: string; name: string }[];
  }, [profile?.following]);

  const followerUsers = useMemo(() => getFollowers(userId), [userId]);

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl space-y-6 text-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-sienna-500 border-t-transparent mx-auto mb-4" />
        <p className="text-sm text-ink-muted">Loading profile…</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="mx-auto max-w-3xl space-y-6 text-center py-20">
        <UserCircle size={48} className="mx-auto text-ink-faint mb-4" />
        <p className="font-serif text-xl text-ink-muted">Profile not found</p>
        <button onClick={onBack} className="btn-primary mt-4">Go back</button>
      </div>
    );
  }

  const items = profile.contexts[profile.default_context]?.ranked_list ?? [];
  const totalPlaces = Object.values(profile.contexts).reduce((sum, ctx) => sum + ctx.ranked_list.length, 0);
  const favItems = items.filter((i) => i.status === "favourite");
  const uniqueCuisines = new Set<string>();
  items.forEach((i) => i.venue.cuisines.forEach((c) => uniqueCuisines.add(c)));
  const cuisineNames = Array.from(uniqueCuisines).slice(0, 3).join(" · ");

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Back button */}
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm font-medium text-ink-faint hover:text-sienna-600 transition"
      >
        ← Back
      </button>

      {/* Header */}
      <div className="rounded-3xl border border-cream-dark bg-paper p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-sienna-500 text-white shadow-sm text-xl font-bold">
            {userName.split(" ")[0][0]}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-serif text-2xl text-ink">{userName}</h2>
            <p className="text-sm text-ink-faint mt-0.5 truncate">
              {cuisineNames || "No taste data yet."}
            </p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-4 gap-3">
          <div
            className="flex flex-col items-center rounded-2xl bg-cream px-4 py-3 cursor-pointer hover:bg-cream-dark transition"
            onClick={() => totalPlaces > 0 && setShowRanked((s) => !s)}
          >
            <ListOrdered size={16} className="text-sienna-500 mb-1" />
            <span className="text-lg font-bold text-ink">{totalPlaces}</span>
            <span className="text-[10px] font-medium uppercase tracking-wider text-ink-faint">Ranked</span>
          </div>
          <div
            className="flex flex-col items-center rounded-2xl bg-cream px-4 py-3 cursor-pointer hover:bg-cream-dark transition"
            onClick={() => favItems.length > 0 && onNavigateToVenue(favItems[0].venue)}
          >
            <Star size={16} className="text-amber-500 mb-1" />
            <span className="text-lg font-bold text-ink">{favItems.length}</span>
            <span className="text-[10px] font-medium uppercase tracking-wider text-ink-faint">Favourites</span>
          </div>
          <div
            className="flex flex-col items-center rounded-2xl bg-cream px-4 py-3 cursor-pointer hover:bg-cream-dark transition"
            onClick={() => followingUsers.length > 0 && setShowFollowing((s) => !s)}
          >
            <Users size={16} className="text-olive-500 mb-1" />
            <span className="text-lg font-bold text-ink">{profile.following.length}</span>
            <span className="text-[10px] font-medium uppercase tracking-wider text-ink-faint">Following</span>
          </div>
          <div
            className="flex flex-col items-center rounded-2xl bg-cream px-4 py-3 cursor-pointer hover:bg-cream-dark transition"
            onClick={() => followerUsers.length > 0 && setShowFollowers((s) => !s)}
          >
            <Heart size={16} className="text-rose-500 mb-1" />
            <span className="text-lg font-bold text-ink">{followerUsers.length}</span>
            <span className="text-[10px] font-medium uppercase tracking-wider text-ink-faint">Followers</span>
          </div>
        </div>
      </div>

      {/* Following list */}
      {showFollowing && followingUsers.length > 0 && (
        <div className="rounded-2xl border border-cream-dark bg-paper p-4 shadow-sm space-y-3">
          <h3 className="font-serif text-lg text-ink">Following</h3>
          <div className="flex flex-wrap gap-2">
            {followingUsers.map((u) => (
              <button
                key={u.id}
                onClick={() => onNavigateToProfile(u.id)}
                className="flex items-center gap-2 rounded-xl bg-cream px-3 py-2 text-sm font-medium text-ink hover:bg-cream-dark transition"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-sienna-100 text-xs font-bold text-sienna-700">
                  {u.name.split(" ")[0][0]}
                </div>
                {u.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Followers list */}
      {showFollowers && followerUsers.length > 0 && (
        <div className="rounded-2xl border border-cream-dark bg-paper p-4 shadow-sm space-y-3">
          <h3 className="font-serif text-lg text-ink">Followers</h3>
          <div className="flex flex-wrap gap-2">
            {followerUsers.map((u) => (
              <button
                key={u.id}
                onClick={() => onNavigateToProfile(u.id)}
                className="flex items-center gap-2 rounded-xl bg-cream px-3 py-2 text-sm font-medium text-ink hover:bg-cream-dark transition"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-rose-100 text-xs font-bold text-rose-700">
                  {u.name.split(" ")[0][0]}
                </div>
                {u.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Full ranked lists */}
      {showRanked && totalPlaces > 0 && (
        <div className="space-y-4">
          <h3 className="font-serif text-lg text-ink">Ranked lists</h3>
          {Object.values(profile.contexts).map((ctx) => (
            <div key={ctx.context_id} className="rounded-2xl border border-cream-dark bg-paper p-4 shadow-sm space-y-3">
              <h4 className="text-sm font-semibold text-ink-faint uppercase tracking-wider">
                {ctx.context_id === "default" ? "Recent visits" : ctx.context_id.replace(/_/g, " ")}
              </h4>
              <div className="space-y-2">
                {ctx.ranked_list.map((item, idx) => (
                  <button
                    key={item.venue.id}
                    onClick={() => onNavigateToVenue(item.venue)}
                    className="flex w-full items-center gap-3 rounded-2xl border border-cream-dark bg-paper p-3 text-left hover:bg-cream transition"
                  >
                    <span className="ml-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-bold ring-1 bg-cream text-ink-faint">
                      {idx + 1}
                    </span>
                    <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-cream-dark">
                      <img src={item.venue.image_url} alt={item.venue.name} className="h-full w-full object-cover" loading="lazy" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-ink">{item.venue.name}</p>
                      <p className="text-xs text-ink-faint">{item.venue.cuisines.slice(0, 3).join(" · ")}</p>
                    </div>
                    {item.status === "favourite" && (
                      <Star size={14} className="text-amber-400 shrink-0" fill="currentColor" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Favourites section */}
      {favItems.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-serif text-lg text-ink">Favourites</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            {favItems.slice(0, 6).map((item) => (
              <button
                key={item.venue.id}
                onClick={() => onNavigateToVenue(item.venue)}
                className="taste-card text-left rounded-2xl border border-cream-dark bg-paper overflow-hidden hover:shadow-card transition"
              >
                <div className="relative w-full overflow-hidden rounded-2xl bg-cream-dark" style={{ aspectRatio: "16/10" }}>
                  <img src={item.venue.image_url} alt={item.venue.name} className="h-full w-full object-cover" loading="lazy" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                  <div className="absolute bottom-3 left-3 right-3">
                    <h3 className="text-base font-semibold text-white drop-shadow">{item.venue.name}</h3>
                    <p className="text-xs text-white/80">{item.venue.cuisines.join(" · ")}</p>
                  </div>
                </div>
                {item.reaction && (
                  <p className="px-4 py-3 text-xs italic text-ink-muted leading-relaxed">“{item.reaction}”</p>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Recent ranked items */}
      {items.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-serif text-lg text-ink">Recent visits</h3>
          <div className="space-y-2">
            {items.slice(0, 8).map((item, idx) => (
              <button
                key={item.venue.id}
                onClick={() => onNavigateToVenue(item.venue)}
                className="flex w-full items-center gap-3 rounded-2xl border border-cream-dark bg-paper p-3 text-left hover:bg-cream transition"
              >
                <span className="ml-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-bold ring-1 bg-cream text-ink-faint">
                  {idx + 1}
                </span>
                <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-cream-dark">
                  <img src={item.venue.image_url} alt={item.venue.name} className="h-full w-full object-cover" loading="lazy" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink">{item.venue.name}</p>
                  <p className="text-xs text-ink-faint">{item.venue.cuisines.slice(0, 3).join(" · ")}</p>
                </div>
                {item.status === "favourite" && (
                  <Star size={14} className="text-amber-400 shrink-0" fill="currentColor" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
