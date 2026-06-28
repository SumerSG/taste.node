import { useState, useMemo, useEffect } from "react";
import type { TasteProfile, RankedItem } from "../data/types";
import { updateItemRating, updateItemReaction, updateItemMealType, updateItemDishes, updateRankedList, removeRankedItem } from "../data/api";
import { SAMPLE_USERS, getFollowers } from "../data/mockData";
import { getFollowersSupabase, resolveUserNamesSupabase } from "../data/supabaseApi";
import { Star, Sun, Moon, Calendar, Trash2, UtensilsCrossed, MessageSquare, ChevronDown, UserCircle, Users, Heart } from "lucide-react";
import { hasSupabase } from "../lib/supabase";

import { useToast } from "../context/ToastContext";

interface Props {
  profile: TasteProfile;
  onProfileChange: (p: TasteProfile) => void;
  onNavigateToVenue?: (v: RankedItem["venue"]) => void;
  onNavigateToProfile?: (userId: string, userName: string) => void;
}

interface RankedItemWithContext extends RankedItem {
  context_id: string;
}

function StarRating({ value, onChange }: { value?: number; onChange?: (n: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange?.(n === value ? 0 : n)}
          onMouseEnter={() => setHover(n)}
          onMouseLeave={() => setHover(0)}
          className={`rounded p-0.5 transition ${onChange ? "cursor-pointer" : "cursor-default"} ${
            n <= (hover || value || 0) ? "text-amber-400" : "text-ink-faint"
          }`}
          disabled={!onChange}
        >
          <Star size={16} fill={n <= (hover || value || 0) ? "currentColor" : "none"} />
        </button>
      ))}
      {value && value > 0 && <span className="ml-1 text-xs font-medium text-ink-muted">{value}/5</span>}
    </div>
  );
}

export function ProfileView({ profile, onProfileChange, onNavigateToVenue, onNavigateToProfile }: Props) {
  const toast = useToast();
  const items = useMemo<RankedItemWithContext[]>(() => {
    const result: RankedItemWithContext[] = [];
    for (const [ctxId, ctx] of Object.entries(profile.contexts)) {
      if (ctxId === "wishlist") continue;
      for (const item of ctx.ranked_list) {
        if (item.status === "wishlist") continue;
        result.push({ ...item, context_id: ctxId });
      }
    }
    return result.sort(
      (a, b) => new Date(b.visited_at).getTime() - new Date(a.visited_at).getTime()
    );
  }, [profile.contexts]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingDishes, setEditingDishes] = useState<string | null>(null);
  const [dishesDraft, setDishesDraft] = useState("");
  const [editingReaction, setEditingReaction] = useState<string | null>(null);
  const [reactionDraft, setReactionDraft] = useState("");
  const [showFollowing, setShowFollowing] = useState(false);
  const [showFollowers, setShowFollowers] = useState(false);

  // Profile stats
  const uniqueCuisines = new Set<string>();
  items.forEach((i) => i.venue.cuisines.forEach((c) => uniqueCuisines.add(c)));
  const cuisineNames = Array.from(uniqueCuisines).slice(0, 3).join(" · ");

  // Resolve names from Supabase when available; fallback to SAMPLE_USERS or truncated id
  const [followingNames, setFollowingNames] = useState<Record<string, string>>({});
  const [followerUsers, setFollowerUsers] = useState<{ id: string; name: string }[] | null>(null);

  useEffect(() => {
    if (!hasSupabase()) return;
    if (profile.following.length > 0) {
      resolveUserNamesSupabase(profile.following).then(setFollowingNames);
    }
    getFollowersSupabase(profile.user_id).then((data) => {
      if (data) setFollowerUsers(data);
    });
  }, [profile.following, profile.user_id]);

  const followingUsers = useMemo(() => {
    return profile.following.map((id) => {
      if (followingNames[id]) return { id, name: followingNames[id] };
      const known = SAMPLE_USERS.find((u) => u.id === id);
      return known ?? { id, name: id.slice(0, 8) + "..." };
    });
  }, [profile.following, followingNames]);

  const resolvedFollowerUsers = (followerUsers && followerUsers.length > 0) ? followerUsers : getFollowers(profile.user_id);

  const handleDateChange = (item: RankedItemWithContext, date: string) => {
    const list = profile.contexts[item.context_id].ranked_list.map((i) =>
      i.venue.id === item.venue.id ? { ...i, visited_at: `${date}T12:00:00+00:00` } : i
    );
    onProfileChange(updateRankedList(profile, list, item.context_id));
  };

  const handleRemove = (venueId: string) => {
    if (!window.confirm("Remove this restaurant from your library?")) return;
    let p = profile;
    for (const [ctxId, ctx] of Object.entries(profile.contexts)) {
      if (ctx.ranked_list.some((r) => r.venue.id === venueId)) {
        p = removeRankedItem(p, venueId, ctxId);
      }
    }
    onProfileChange(p);
    toast.show("Removed from library", "success");
  };

  const saveDishes = (venueId: string, contextId: string) => {
    const dishes = dishesDraft.split(",").map((d) => d.trim()).filter(Boolean);
    onProfileChange(updateItemDishes(profile, venueId, dishes, contextId));
    setEditingDishes(null);
  };

  const saveReaction = (venueId: string, contextId: string) => {
    onProfileChange(updateItemReaction(profile, venueId, reactionDraft.trim(), contextId));
    setEditingReaction(null);
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Profile header */}
      <div className="rounded-3xl border border-cream-dark bg-paper p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-sienna-500 text-white shadow-sm">
            <UserCircle size={32} />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-serif text-2xl text-ink">Your Taste Profile</h2>
            <p className="text-sm text-ink-faint mt-0.5 truncate">
              {cuisineNames || "Start ranking restaurants to build your profile."}
            </p>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <button
            onClick={() => setShowFollowing((s) => !s)}
            className="flex flex-col items-center rounded-2xl bg-cream px-4 py-3 hover:bg-cream-dark transition"
          >
            <Users size={16} className="text-olive-500 mb-1" />
            <span className="text-lg font-bold text-ink">{profile.following.length}</span>
            <span className="text-[10px] font-medium uppercase tracking-wider text-ink-faint">Following</span>
          </button>
          <button
            onClick={() => setShowFollowers((s) => !s)}
            className="flex flex-col items-center rounded-2xl bg-cream px-4 py-3 hover:bg-cream-dark transition"
          >
            <Heart size={16} className="text-rose-500 mb-1" />
            <span className="text-lg font-bold text-ink">{resolvedFollowerUsers.length}</span>
            <span className="text-[10px] font-medium uppercase tracking-wider text-ink-faint">Followers</span>
          </button>
        </div>

        {/* Following list */}
        {showFollowing && followingUsers.length > 0 && (
          <div className="mt-4 rounded-xl bg-cream px-4 py-3 space-y-2">
            <h4 className="text-sm font-medium text-ink">Following</h4>
            <div className="flex flex-wrap gap-2">
              {followingUsers.map((u) => (
                <button
                  key={u.id}
                  onClick={() => onNavigateToProfile?.(u.id, u.name)}
                  className="flex items-center gap-2 rounded-lg bg-paper px-2.5 py-1.5 text-xs font-medium text-ink hover:bg-cream-dark transition"
                >
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-sienna-100 text-[10px] font-bold text-sienna-700">
                    {u.name.split(" ")[0][0]}
                  </div>
                  {u.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Followers list */}
        {showFollowers && resolvedFollowerUsers.length > 0 && (
          <div className="mt-4 rounded-xl bg-cream px-4 py-3 space-y-2">
            <h4 className="text-sm font-medium text-ink">Followers</h4>
            <div className="flex flex-wrap gap-2">
              {resolvedFollowerUsers.map((u) => (
                <button
                  key={u.id}
                  onClick={() => onNavigateToProfile?.(u.id, u.name)}
                  className="flex items-center gap-2 rounded-lg bg-paper px-2.5 py-1.5 text-xs font-medium text-ink hover:bg-cream-dark transition"
                >
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-rose-100 text-[10px] font-bold text-rose-700">
                    {u.name.split(" ")[0][0]}
                  </div>
                  {u.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Section header */}
      <div className="flex items-end justify-between">
        <div>
          <h3 className="font-serif text-xl text-ink">Library</h3>
          <p className="text-sm text-ink-faint mt-1">
            Every place you've saved. Tap a card to expand and rate, react, or note what you ate.
          </p>
        </div>
        <div className="text-sm text-ink-faint">{items.length} visited</div>
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-cream-dark py-20 text-center">
          <UserCircle size={40} className="mb-3 text-ink-faint" />
          <p className="font-serif text-lg text-ink-muted">Your library is empty</p>
          <p className="text-sm text-ink-faint mt-1">Search for restaurants and save them to build your library.</p>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => {
            const isExpanded = expandedId === item.venue.id;
            return (
              <div
                key={item.venue.id}
                className="taste-card rounded-2xl border border-cream-dark bg-paper overflow-hidden"
              >
                {/* Image */}
                <div
                  className="relative aspect-[16/10] overflow-hidden cursor-pointer"
                  onClick={() => onNavigateToVenue?.(item.venue)}
                >
                  <img src={item.venue.image_url} alt={item.venue.name} className="h-full w-full object-cover" loading="lazy" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                  <div className="absolute bottom-3 left-10 right-3">
                    <h3 className="text-base font-semibold text-white drop-shadow">{item.venue.name}</h3>
                    <p className="text-xs text-white/80">{item.venue.cuisines.join(" · ")}</p>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleRemove(item.venue.id); }}
                    className="absolute left-2 bottom-2 rounded-lg bg-black/30 p-2 text-white backdrop-blur-md transition hover:bg-red-500/80 min-h-[32px] min-w-[32px] flex items-center justify-center"
                    title="Remove from library"
                    aria-label="Remove from library"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>

                {/* Collapsed summary */}
                <div className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <StarRating
                      value={item.personal_rating}
                      onChange={(n) => onProfileChange(updateItemRating(profile, item.venue.id, n || undefined, item.context_id))}
                    />
                    <span className="rounded-full bg-cream px-2 py-0.5 text-[10px] font-bold uppercase text-ink-muted">
                      {item.status ?? "visited"}
                    </span>
                  </div>

                  {(item.reaction || item.dishes?.length) && (
                    <div className="text-xs text-ink-faint leading-relaxed line-clamp-2">
                      {item.reaction && <span className="italic">“{item.reaction}”</span>}
                      {item.dishes?.length ? (
                        <span className="text-ink-muted">{item.reaction ? " · " : ""}{item.dishes.join(", ")}</span>
                      ) : null}
                    </div>
                  )}

                  <button
                    onClick={() => setExpandedId(isExpanded ? null : item.venue.id)}
                    className="flex items-center gap-1 text-xs font-medium text-ink-faint hover:text-sienna-600 transition"
                  >
                    {isExpanded ? "Show less" : "Show more"}
                    <ChevronDown size={14} className={`transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                  </button>
                </div>

                {/* Expanded editing surface */}
                {isExpanded && (
                  <div className="border-t border-cream-dark bg-cream/50 px-4 py-4 space-y-4">
                    {/* Date + Meal */}
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 text-xs text-ink-muted">
                        <Calendar size={11} />
                        <input
                          type="date"
                          value={item.visited_at.slice(0, 10)}
                          onChange={(e) => handleDateChange(item, e.target.value)}
                          className="rounded border border-cream-dark bg-paper px-1.5 py-0.5 text-xs focus:border-sienna-400 focus:outline-none"
                        />
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => onProfileChange(updateItemMealType(profile, item.venue.id, item.meal_type === "lunch" ? undefined : "lunch", item.context_id))}
                          className={`flex items-center gap-1 rounded-lg px-2 py-0.5 text-[10px] font-medium ring-1 transition ${
                            item.meal_type === "lunch"
                              ? "bg-amber-50 text-amber-700 ring-amber-200"
                              : "bg-paper text-ink-faint ring-cream-dark hover:bg-cream"
                          }`}
                        >
                          <Sun size={10} /> Lunch
                        </button>
                        <button
                          onClick={() => onProfileChange(updateItemMealType(profile, item.venue.id, item.meal_type === "dinner" ? undefined : "dinner", item.context_id))}
                          className={`flex items-center gap-1 rounded-lg px-2 py-0.5 text-[10px] font-medium ring-1 transition ${
                            item.meal_type === "dinner"
                              ? "bg-indigo-50 text-indigo-700 ring-indigo-200"
                              : "bg-paper text-ink-faint ring-cream-dark hover:bg-cream"
                          }`}
                        >
                          <Moon size={10} /> Dinner
                        </button>
                      </div>
                    </div>

                    {/* Reaction */}
                    <div>
                      {editingReaction === item.venue.id ? (
                        <div className="flex items-start gap-2">
                          <MessageSquare size={12} className="mt-1 shrink-0 text-ink-faint" />
                          <div className="flex-1">
                            <textarea
                              value={reactionDraft}
                              onChange={(e) => setReactionDraft(e.target.value)}
                              rows={2}
                              className="w-full rounded-lg border border-cream-dark bg-paper p-2 text-xs shadow-sm focus:border-sienna-400 focus:outline-none focus:ring-1 focus:ring-sienna-100"
                              autoFocus
                            />
                            <div className="mt-1 flex justify-end gap-1">
                              <button onClick={() => setEditingReaction(null)} className="rounded px-2 py-0.5 text-[10px] text-ink-faint hover:bg-cream">Cancel</button>
                              <button onClick={() => saveReaction(item.venue.id, item.context_id)} className="rounded bg-sienna-500 px-2 py-0.5 text-[10px] font-medium text-white hover:bg-sienna-600">Save</button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <button onClick={() => { setEditingReaction(item.venue.id); setReactionDraft(item.reaction ?? ""); }} className="flex w-full items-start gap-2 text-left">
                          <MessageSquare size={12} className="mt-0.5 shrink-0 text-ink-faint" />
                          {item.reaction ? (
                            <p className="text-xs italic text-ink-muted leading-relaxed">&ldquo;{item.reaction}&rdquo;</p>
                          ) : (
                            <span className="text-xs text-ink-faint">Add your reaction...</span>
                          )}
                        </button>
                      )}
                    </div>

                    {/* Dishes */}
                    <div>
                      {editingDishes === item.venue.id ? (
                        <div className="flex items-start gap-2">
                          <UtensilsCrossed size={12} className="mt-1 shrink-0 text-ink-faint" />
                          <div className="flex-1">
                            <input
                              value={dishesDraft}
                              onChange={(e) => setDishesDraft(e.target.value)}
                              placeholder="Ramen, gyoza..."
                              className="w-full rounded-lg border border-cream-dark bg-paper px-2 py-1 text-xs shadow-sm focus:border-sienna-400 focus:outline-none focus:ring-1 focus:ring-sienna-100"
                              autoFocus
                              onKeyDown={(e) => { if (e.key === "Enter") saveDishes(item.venue.id, item.context_id); if (e.key === "Escape") setEditingDishes(null); }}
                            />
                            <div className="mt-1 flex justify-end gap-1">
                              <button onClick={() => setEditingDishes(null)} className="rounded px-2 py-0.5 text-[10px] text-ink-faint hover:bg-cream">Cancel</button>
                              <button onClick={() => saveDishes(item.venue.id, item.context_id)} className="rounded bg-sienna-500 px-2 py-0.5 text-[10px] font-medium text-white hover:bg-sienna-600">Save</button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <button onClick={() => { setEditingDishes(item.venue.id); setDishesDraft((item.dishes ?? []).join(", ")); }} className="flex w-full items-start gap-2 text-left">
                          <UtensilsCrossed size={12} className="mt-0.5 shrink-0 text-ink-faint" />
                          {item.dishes && item.dishes.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {item.dishes.map((d) => (
                                <span key={d} className="rounded-full bg-cream px-2 py-0.5 text-[10px] font-medium text-ink-muted">
                                  {d}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-xs text-ink-faint">Add what you ate...</span>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
