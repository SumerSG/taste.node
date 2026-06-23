import { useState, useMemo } from "react";
import type { TasteProfile, RankedItem } from "../data/types";
import { updateItemRating, updateItemReaction, updateItemMealType, updateItemDishes, updateRankedList } from "../data/api";
import { Star, Sun, Moon, Calendar, Trash2, UtensilsCrossed, MessageSquare, BookOpen, ChevronDown } from "lucide-react";

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

export function LibraryView({ profile, onProfileChange }: Props) {
  const items = profile.contexts[profile.default_context].ranked_list;
  const [expandedId, setExpandedId] = useState<string | null>(null);
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

  const saveDishes = (venueId: string) => {
    const dishes = dishesDraft.split(",").map((d) => d.trim()).filter(Boolean);
    onProfileChange(updateItemDishes(profile, venueId, dishes));
    setEditingDishes(null);
  };

  const saveReaction = (venueId: string) => {
    onProfileChange(updateItemReaction(profile, venueId, reactionDraft.trim()));
    setEditingReaction(null);
  };

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="font-serif text-2xl text-ink">Library</h2>
          <p className="text-sm text-ink-faint mt-1">
            Every restaurant you've visited. Tap a card to expand and add your rating, reaction, and what you ate.
          </p>
        </div>
        <div className="text-sm text-ink-faint">{sorted.length} visited</div>
      </div>

      {sorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-cream-dark py-20 text-center">
          <BookOpen size={40} className="mb-3 text-ink-faint" />
          <p className="font-serif text-lg text-ink-muted">Your library is empty</p>
          <p className="text-sm text-ink-faint mt-1">Search for restaurants and save them to build your library.</p>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {sorted.map((item) => {
            const isExpanded = expandedId === item.venue.id;
            return (
              <div
                key={item.venue.id}
                className="taste-card rounded-2xl border border-cream-dark bg-paper overflow-hidden"
              >
                {/* Image */}
                <div
                  className="relative aspect-[16/10] overflow-hidden cursor-pointer"
                  onClick={() => setExpandedId(isExpanded ? null : item.venue.id)}
                >
                  <img src={item.venue.image_url} alt={item.venue.name} className="h-full w-full object-cover" loading="lazy" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                  <div className="absolute bottom-3 left-3 right-3">
                    <h3 className="text-base font-semibold text-white drop-shadow">{item.venue.name}</h3>
                    <p className="text-xs text-white/80">{item.venue.cuisines.join(" · ")}</p>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleRemove(item.venue.id); }}
                    className="absolute right-2 top-2 rounded-lg bg-black/30 p-1.5 text-white backdrop-blur-md transition hover:bg-red-500/80"
                    title="Remove from library"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>

                {/* Collapsed summary */}
                <div className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <StarRating
                      value={item.personal_rating}
                      onChange={(n) => onProfileChange(updateItemRating(profile, item.venue.id, n || undefined))}
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
                          onClick={() => onProfileChange(updateItemMealType(profile, item.venue.id, item.meal_type === "lunch" ? undefined : "lunch"))}
                          className={`flex items-center gap-1 rounded-lg px-2 py-0.5 text-[10px] font-medium ring-1 transition ${
                            item.meal_type === "lunch"
                              ? "bg-amber-50 text-amber-700 ring-amber-200"
                              : "bg-paper text-ink-faint ring-cream-dark hover:bg-cream"
                          }`}
                        >
                          <Sun size={10} /> Lunch
                        </button>
                        <button
                          onClick={() => onProfileChange(updateItemMealType(profile, item.venue.id, item.meal_type === "dinner" ? undefined : "dinner"))}
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
                              <button onClick={() => saveReaction(item.venue.id)} className="rounded bg-sienna-500 px-2 py-0.5 text-[10px] font-medium text-white hover:bg-sienna-600">Save</button>
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
                              onKeyDown={(e) => { if (e.key === "Enter") saveDishes(item.venue.id); if (e.key === "Escape") setEditingDishes(null); }}
                            />
                            <div className="mt-1 flex justify-end gap-1">
                              <button onClick={() => setEditingDishes(null)} className="rounded px-2 py-0.5 text-[10px] text-ink-faint hover:bg-cream">Cancel</button>
                              <button onClick={() => saveDishes(item.venue.id)} className="rounded bg-sienna-500 px-2 py-0.5 text-[10px] font-medium text-white hover:bg-sienna-600">Save</button>
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
