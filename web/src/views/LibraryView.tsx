import { useState, useMemo } from "react";
import type { TasteProfile, RankedItem } from "../data/types";
import { updateItemRating, updateItemReaction, updateItemMealType, updateItemDishes, updateRankedList } from "../data/api";
import { Star, Sun, Moon, Calendar, Trash2, UtensilsCrossed, MessageSquare, BookOpen } from "lucide-react";

interface Props {
  profile: TasteProfile;
  onProfileChange: (p: TasteProfile) => void;
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
            n <= (hover || value || 0) ? "text-amber-400" : "text-surface-300"
          }`}
          disabled={!onChange}
        >
          <Star size={16} fill={n <= (hover || value || 0) ? "currentColor" : "none"} />
        </button>
      ))}
      {value && value > 0 && <span className="ml-1 text-xs font-medium text-surface-500">{value}/5</span>}
    </div>
  );
}

export function LibraryView({ profile, onProfileChange }: Props) {
  const items = profile.contexts[profile.default_context].ranked_list;
  const [editingDishes, setEditingDishes] = useState<string | null>(null);
  const [dishesDraft, setDishesDraft] = useState("");
  const [editingReaction, setEditingReaction] = useState<string | null>(null);
  const [reactionDraft, setReactionDraft] = useState("");

  const sorted = useMemo(() => {
    return [...items].sort(
      (a, b) => new Date(b.visited_at).getTime() - new Date(a.visited_at).getTime()
    );
  }, [items]);

  const handleDateChange = (item: RankedItem, date: string) => {
    const list = items.map((i) => (i.venue.id === item.venue.id ? { ...i, visited_at: `${date}T12:00:00+00:00` } : i));
    onProfileChange(updateRankedList(profile, list));
  };

  const handleRemove = (venueId: string) => {
    const list = items.filter((i) => i.venue.id !== venueId);
    onProfileChange(updateRankedList(profile, list));
  };

  const startEditingDishes = (item: RankedItem) => {
    setEditingDishes(item.venue.id);
    setDishesDraft((item.dishes ?? []).join(", "));
  };

  const saveDishes = (venueId: string) => {
    const dishes = dishesDraft
      .split(",")
      .map((d) => d.trim())
      .filter(Boolean);
    onProfileChange(updateItemDishes(profile, venueId, dishes));
    setEditingDishes(null);
  };

  const startEditingReaction = (item: RankedItem) => {
    setEditingReaction(item.venue.id);
    setReactionDraft(item.reaction ?? "");
  };

  const saveReaction = (venueId: string) => {
    onProfileChange(updateItemReaction(profile, venueId, reactionDraft.trim()));
    setEditingReaction(null);
  };

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-bold text-surface-900">Library</h2>
          <p className="text-sm text-surface-500 mt-1">
            Every restaurant you've visited. Add your rating, reaction, and what you ate.
          </p>
        </div>
        <div className="text-sm text-surface-500">{sorted.length} visited</div>
      </div>

      {sorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-surface-200 py-20 text-center">
          <BookOpen size={40} className="mb-3 text-surface-300" />
          <p className="text-lg font-semibold text-surface-600">Your library is empty</p>
          <p className="text-sm text-surface-400 mt-1">Search for restaurants and save them to build your library.</p>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {sorted.map((item) => (
            <div
              key={item.venue.id}
              className="rounded-2xl border border-surface-200 bg-white shadow-card ring-1 ring-surface-100 overflow-hidden"
            >
              {/* Image */}
              <div className="relative aspect-[16/10] overflow-hidden">
                <img
                  src={item.venue.image_url}
                  alt={item.venue.name}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                <div className="absolute bottom-3 left-3 right-3">
                  <h3 className="text-base font-bold text-white drop-shadow">{item.venue.name}</h3>
                  <p className="text-xs text-white/80">{item.venue.cuisines.join(" · ")}</p>
                </div>
                <button
                  onClick={() => handleRemove(item.venue.id)}
                  className="absolute right-2 top-2 rounded-lg bg-black/30 p-1.5 text-white backdrop-blur-md transition hover:bg-red-500/80"
                  title="Remove from library"
                >
                  <Trash2 size={13} />
                </button>
              </div>

              {/* Details */}
              <div className="space-y-3 p-4">
                {/* Rating */}
                <div className="flex items-center justify-between">
                  <StarRating
                    value={item.personal_rating}
                    onChange={(n) => onProfileChange(updateItemRating(profile, item.venue.id, n || undefined))}
                  />
                  <span className="rounded-full bg-surface-100 px-2 py-0.5 text-[10px] font-bold uppercase text-surface-500">
                    {item.status ?? "visited"}
                  </span>
                </div>

                {/* Date + Meal */}
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 text-xs text-surface-500">
                    <Calendar size={11} />
                    <input
                      type="date"
                      value={item.visited_at.slice(0, 10)}
                      onChange={(e) => handleDateChange(item, e.target.value)}
                      className="rounded border border-surface-200 bg-surface-50 px-1.5 py-0.5 text-xs focus:border-brand-400 focus:outline-none"
                    />
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() =>
                        onProfileChange(updateItemMealType(profile, item.venue.id, item.meal_type === "lunch" ? undefined : "lunch"))
                      }
                      className={`flex items-center gap-1 rounded-lg px-2 py-0.5 text-[10px] font-medium ring-1 transition ${
                        item.meal_type === "lunch"
                          ? "bg-amber-50 text-amber-700 ring-amber-200"
                          : "bg-white text-surface-400 ring-surface-200 hover:bg-surface-50"
                      }`}
                    >
                      <Sun size={10} /> Lunch
                    </button>
                    <button
                      onClick={() =>
                        onProfileChange(updateItemMealType(profile, item.venue.id, item.meal_type === "dinner" ? undefined : "dinner"))
                      }
                      className={`flex items-center gap-1 rounded-lg px-2 py-0.5 text-[10px] font-medium ring-1 transition ${
                        item.meal_type === "dinner"
                          ? "bg-indigo-50 text-indigo-700 ring-indigo-200"
                          : "bg-white text-surface-400 ring-surface-200 hover:bg-surface-50"
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
                      <MessageSquare size={12} className="mt-1 shrink-0 text-surface-400" />
                      <div className="flex-1">
                        <textarea
                          value={reactionDraft}
                          onChange={(e) => setReactionDraft(e.target.value)}
                          rows={2}
                          className="w-full rounded-lg border border-surface-200 bg-surface-50 p-2 text-xs shadow-sm focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-100"
                          autoFocus
                        />
                        <div className="mt-1 flex justify-end gap-1">
                          <button onClick={() => setEditingReaction(null)} className="rounded px-2 py-0.5 text-[10px] text-surface-500 hover:bg-surface-100">Cancel</button>
                          <button onClick={() => saveReaction(item.venue.id)} className="rounded bg-brand-600 px-2 py-0.5 text-[10px] font-medium text-white hover:bg-brand-700">Save</button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => startEditingReaction(item)}
                      className="flex w-full items-start gap-2 text-left"
                    >
                      <MessageSquare size={12} className="mt-0.5 shrink-0 text-surface-400" />
                      {item.reaction ? (
                        <p className="text-xs italic text-surface-600 leading-relaxed">&ldquo;{item.reaction}&rdquo;</p>
                      ) : (
                        <span className="text-xs text-surface-400">Add your reaction...</span>
                      )}
                    </button>
                  )}
                </div>

                {/* Dishes */}
                <div>
                  {editingDishes === item.venue.id ? (
                    <div className="flex items-start gap-2">
                      <UtensilsCrossed size={12} className="mt-1 shrink-0 text-surface-400" />
                      <div className="flex-1">
                        <input
                          value={dishesDraft}
                          onChange={(e) => setDishesDraft(e.target.value)}
                          placeholder="Ramen, gyoza..."
                          className="w-full rounded-lg border border-surface-200 bg-surface-50 px-2 py-1 text-xs shadow-sm focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-100"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter") saveDishes(item.venue.id);
                            if (e.key === "Escape") setEditingDishes(null);
                          }}
                        />
                        <div className="mt-1 flex justify-end gap-1">
                          <button onClick={() => setEditingDishes(null)} className="rounded px-2 py-0.5 text-[10px] text-surface-500 hover:bg-surface-100">Cancel</button>
                          <button onClick={() => saveDishes(item.venue.id)} className="rounded bg-brand-600 px-2 py-0.5 text-[10px] font-medium text-white hover:bg-brand-700">Save</button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => startEditingDishes(item)} className="flex w-full items-start gap-2 text-left">
                      <UtensilsCrossed size={12} className="mt-0.5 shrink-0 text-surface-400" />
                      {item.dishes && item.dishes.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {item.dishes.map((d) => (
                            <span key={d} className="rounded-full bg-surface-100 px-2 py-0.5 text-[10px] font-medium text-surface-600">
                              {d}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-surface-400">Add what you ate...</span>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
