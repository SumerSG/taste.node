import { useState, useRef } from "react";
import type { Venue, RankedItem, RankStatus, TasteProfile } from "../data/types";
import { useModalTrap } from "../hooks/useModalTrap";
import {
  X,
  Heart,
  Star,
  ThumbsDown,
  ChevronRight,
  ChevronLeft,
  Tag,
  Calendar,
  Sun,
  Moon,
  UtensilsCrossed,
  MessageSquare,
  Sparkles,
  Plus,
} from "lucide-react";
import {
  statusColor,
  statusDescription,
  parseListSentiment,
} from "../data/mockData";
import { useToast } from "../context/ToastContext";

interface Props {
  venue: Venue;
  profile: TasteProfile;
  open: boolean;
  onClose: () => void;
  onAdd: (item: RankedItem, contextId: string) => void;
  existingData?: RankedItem;
}

export function VenueDetailModal({
  venue,
  profile,
  open,
  onClose,
  onAdd,
  existingData,
}: Props) {
  const modalRef = useRef<HTMLDivElement>(null);
  const toast = useToast();
  useModalTrap(open, onClose, modalRef);

  const contextIds = Object.keys(profile.contexts);
  const defaultCtx = profile.default_context;

  // ── Step / mode ──
  const hasExisting = !!existingData;
  const isWishlist = existingData?.status === "wishlist";

  // "pick" only shown for entirely new items (not from wishlist)
  const [step, setStep] = useState<
    "pick" | "relationship" | "details"
  >(hasExisting && !isWishlist ? "relationship" : "pick");

  // ── Form state ──
  const [targetCtx, setTargetCtx] = useState(defaultCtx);
  const [newCtxName, setNewCtxName] = useState("");
  const [showNewCtx, setShowNewCtx] = useState(false);

  const [occasion, setOccasion] = useState<RankedItem["occasion_tag"]> (
    existingData?.occasion_tag ?? "solo"
  );
  const [visited, setVisited] = useState(
    existingData
      ? existingData.visited_at.slice(0, 10)
      : new Date().toISOString().slice(0, 10)
  );
  const [classic, setClassic] = useState(existingData?.is_classic ?? false);
  const [status, setStatus] = useState<RankStatus>(
    isWishlist ? "visited" : existingData?.status ?? "visited"
  );
  const [personalRating, setPersonalRating] = useState<number>(
    existingData?.personal_rating ?? 0
  );
  const [reaction, setReaction] = useState(existingData?.reaction ?? "");
  const [mealType, setMealType] = useState<
    "lunch" | "dinner" | undefined
  >(existingData?.meal_type ?? undefined);
  const [dishesInput, setDishesInput] = useState(
    existingData?.dishes?.join(", ") ?? ""
  );

  if (!open) return null;

  const activeCtxId = showNewCtx && newCtxName.trim() ? newCtxName.trim() : targetCtx;
  const sentiment = parseListSentiment(activeCtxId);

  const handleSave = () => {
    const dishes = dishesInput
      .split(",")
      .map((d) => d.trim())
      .filter(Boolean);
    const item: RankedItem = {
      venue,
      visited_at: `${visited}T12:00:00+00:00`,
      added_at: new Date().toISOString(),
      occasion_tag: occasion,
      is_classic: classic,
      status,
      personal_rating: personalRating > 0 ? personalRating : undefined,
      reaction: reaction.trim() || undefined,
      meal_type: mealType,
      dishes: dishes.length > 0 ? dishes : undefined,
    };
    onAdd(item, activeCtxId);
    toast.show("Saved to library", "success");
    onClose();
  };

  const sentimentBadge = () => {
    if (sentiment > 0) return <span className="text-[10px] font-medium text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">Positive list</span>;
    if (sentiment < 0) return <span className="text-[10px] font-medium text-red-600 bg-red-50 px-1.5 py-0.5 rounded-full">Negative list</span>;
    return <span className="text-[10px] font-medium text-stone-500 bg-stone-100 px-1.5 py-0.5 rounded-full">Neutral</span>;
  };

  return (
    <div ref={modalRef} className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4 backdrop-blur-sm">
      <div className="flex max-h-[92vh] sm:max-h-[90vh] w-full sm:max-w-lg flex-col overflow-hidden rounded-t-3xl sm:rounded-3xl bg-paper shadow-elevated">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-cream-dark px-5 py-3">
          <h2 className="text-sm font-semibold text-ink">{venue.name}</h2>
          <button onClick={onClose} className="rounded-full p-1 text-ink-faint hover:bg-cream transition" aria-label="Close">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* ── STEP 1: Pick relationship ── */}
          {step === "pick" && (
            <div className="p-6 space-y-5">
              <div className="relative aspect-video rounded-2xl overflow-hidden">
                <img src={venue.image_url} alt={venue.name} className="h-full w-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                <div className="absolute bottom-4 left-4">
                  <p className="text-sm text-white/80">{venue.cuisines.join(" · ")}</p>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm text-ink-muted text-center">What would you like to do?</p>
                <button
                  onClick={() => {
                    const item: RankedItem = {
                      venue,
                      visited_at: `${new Date().toISOString().slice(0, 10)}T12:00:00+00:00`,
                      added_at: new Date().toISOString(),
                      occasion_tag: "solo",
                      is_classic: false,
                      status: "wishlist",
                    };
                    onAdd(item, "wishlist");
                    toast.show("Saved for later", "success");
                    onClose();
                  }}
                  className="w-full rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800 hover:bg-amber-100 transition"
                >
                  Save for later
                </button>
                <button
                  onClick={() => setStep("relationship")}
                  className="btn-primary w-full gap-2"
                >
                  I've been here <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 2: Relationship ── */}
          {step === "relationship" && (
            <div className="p-5 space-y-6">
              {/* Quick sentiment */}
              <div className="space-y-3">
                <h3 className="font-serif text-lg text-ink">How was it?</h3>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setStatus("favourite")}
                    className={`rounded-xl px-3 py-3 text-xs font-medium ring-1 transition-all ${
                      status === "favourite"
                        ? statusColor("favourite")
                        : "bg-cream text-ink-muted ring-cream-dark hover:bg-cream-warm"
                    }`}
                  >
                    <Heart size={14} className="inline mr-1" /> Favourite
                  </button>
                  <button
                    onClick={() => setStatus("not_for_me")}
                    className={`rounded-xl px-3 py-3 text-xs font-medium ring-1 transition-all ${
                      status === "not_for_me"
                        ? statusColor("not_for_me")
                        : "bg-cream text-ink-muted ring-cream-dark hover:bg-cream-warm"
                    }`}
                  >
                    <ThumbsDown size={14} className="inline mr-1" /> Not for me
                  </button>
                </div>
                {status === "visited" && (
                  <p className="text-xs text-ink-faint">No sentiment selected — saved as a neutral visit.</p>
                )}
                <p className="text-xs text-ink-faint">
                  {statusDescription(status)}
                </p>
              </div>

              {/* Rating */}
              <div>
                <label className="mb-2 block text-sm font-medium text-ink-muted">Your rating</label>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      onClick={() => setPersonalRating(n === personalRating ? 0 : n)}
                      className={`rounded p-1 transition ${n <= personalRating ? "text-amber-400" : "text-ink-faint hover:text-amber-300"}`}
                    >
                      <Star size={28} fill={n <= personalRating ? "currentColor" : "none"} />
                    </button>
                  ))}
                  {personalRating > 0 && <span className="ml-2 text-sm font-medium text-ink-muted">{personalRating}/5</span>}
                </div>
              </div>

              {/* Context / list selector */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-ink-muted">Add to list</label>
                {showNewCtx ? (
                  <div className="space-y-2">
                    <input
                      autoFocus
                      value={newCtxName}
                      onChange={(e) => setNewCtxName(e.target.value)}
                      placeholder="e.g. Date nights"
                      className="w-full rounded-xl border-cream-dark bg-cream px-3 py-2 text-sm shadow-sm focus:border-sienna-400 focus:outline-none focus:ring-2 focus:ring-sienna-100"
                    />
                    <div className="flex items-center justify-between">
                      {newCtxName.trim() && <div className="flex items-center gap-2">{sentimentBadge()}</div>}
                      <button onClick={() => setShowNewCtx(false)} className="text-xs text-ink-faint hover:text-ink-muted">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {contextIds.map((cid) => (
                      <button
                        key={cid}
                        onClick={() => setTargetCtx(cid)}
                        className={`rounded-lg px-3 py-2 text-xs font-medium ring-1 transition ${
                          targetCtx === cid
                            ? "bg-sienna-50 text-sienna-700 ring-sienna-200"
                            : "bg-cream text-ink-muted ring-cream-dark hover:bg-cream-warm"
                        }`}
                      >
                        {cid === "default" ? "My Favs" : cid.replace(/_/g, " ")}
                      </button>
                    ))}
                    <button
                      onClick={() => setShowNewCtx(true)}
                      className="flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-medium ring-1 bg-cream text-ink-muted ring-cream-dark hover:bg-cream-warm"
                    >
                      <Plus size={12} /> New list
                    </button>
                  </div>
                )}
                <p className="text-xs text-ink-faint">
                  <Sparkles size={10} className="inline mr-1" />
                  List tone is auto-parsed to tune how it influences taste matching.
                </p>
              </div>

              {/* Occasion */}
              <div>
                <label className="mb-2 block text-sm font-medium text-ink-muted">Occasion</label>
                <div className="flex flex-wrap gap-2">
                  {["solo", "date", "business", "group", "comfort"].map((o) => (
                    <button
                      key={o}
                      onClick={() => setOccasion(o as RankedItem["occasion_tag"])}
                      className={`rounded-lg px-3 py-2 text-xs font-medium ring-1 transition ${
                        occasion === o
                          ? "bg-sienna-50 text-sienna-700 ring-sienna-200"
                          : "bg-cream text-ink-muted ring-cream-dark hover:bg-cream-warm"
                      }`}
                    >
                      {o.charAt(0).toUpperCase() + o.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Timeless toggle */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setClassic(!classic)}
                    className={`rounded-lg px-3 py-2 text-xs font-medium ring-1 transition ${
                      classic
                        ? "bg-sienna-50 text-sienna-700 ring-sienna-200"
                        : "bg-cream text-ink-muted ring-cream-dark hover:bg-cream-warm"
                    }`}
                  >
                    <Tag size={12} className="inline mr-1" />
                    {classic ? "Timeless ✓" : "Mark timeless"}
                  </button>
                </div>
                <p className="text-xs text-ink-faint leading-relaxed">
                  <strong>Timeless</strong> means this place defines your taste forever — it never
                  loses weight in your taste profile, even years later.
                </p>
              </div>

              <div className="flex gap-3">
                <button onClick={() => setStep("pick")} className="btn-secondary flex-1 gap-1">
                  <ChevronLeft size={14} /> Back
                </button>
                <button onClick={() => setStep("details")} className="btn-primary flex-1 gap-1">
                  More details <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 3: Details ── */}
          {step === "details" && (
            <div className="p-5 space-y-5">
              <div>
                <h3 className="font-serif text-lg text-ink mb-4">Tell us more</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-ink-muted flex items-center gap-1">
                      <Calendar size={12} /> Visited on
                    </label>
                    <input
                      type="date"
                      value={visited}
                      onChange={(e) => setVisited(e.target.value)}
                      className="w-full rounded-xl border-cream-dark bg-cream px-3 py-2 text-sm shadow-sm focus:border-sienna-400 focus:ring-sienna-100"
                    />
                  </div>
                </div>
                <p className="text-xs text-ink-faint mt-2">
                  Your most recent visit to each place is what shapes your taste cluster. A
                  visit from last week counts more than one from two years ago.
                </p>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-ink-muted">Meal type</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setMealType(mealType === "lunch" ? undefined : "lunch")}
                    className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-medium ring-1 transition ${
                      mealType === "lunch"
                        ? "bg-sienna-50 text-sienna-700 ring-sienna-200"
                        : "bg-cream text-ink-muted ring-cream-dark hover:bg-cream-warm"
                    }`}
                  >
                    <Sun size={13} /> Lunch
                  </button>
                  <button
                    onClick={() => setMealType(mealType === "dinner" ? undefined : "dinner")}
                    className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-medium ring-1 transition ${
                      mealType === "dinner"
                        ? "bg-sienna-50 text-sienna-700 ring-sienna-200"
                        : "bg-cream text-ink-muted ring-cream-dark hover:bg-cream-warm"
                    }`}
                  >
                    <Moon size={13} /> Dinner
                  </button>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-ink-muted flex items-center gap-1">
                  <UtensilsCrossed size={12} /> What you ate
                </label>
                <input
                  value={dishesInput}
                  onChange={(e) => setDishesInput(e.target.value)}
                  placeholder="Ramen, gyoza, beer..."
                  className="w-full rounded-xl border-cream-dark bg-cream px-3 py-2 text-sm shadow-sm transition focus:border-sienna-400 focus:outline-none focus:ring-2 focus:ring-sienna-100"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-ink-muted flex items-center gap-1">
                  <MessageSquare size={12} /> Your take
                </label>
                <textarea
                  value={reaction}
                  onChange={(e) => setReaction(e.target.value)}
                  placeholder="A few words about the experience..."
                  rows={2}
                  className="w-full rounded-xl border-cream-dark bg-cream p-3 text-sm shadow-sm transition focus:border-sienna-400 focus:outline-none focus:ring-2 focus:ring-sienna-100"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={() => setStep("relationship")} className="btn-secondary flex-1 gap-1">
                  <ChevronLeft size={14} /> Back
                </button>
                <button onClick={handleSave} className="btn-primary flex-1 gap-2">
                  <Heart size={15} /> Save to library
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
