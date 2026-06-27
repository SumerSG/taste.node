import { useState, useRef } from "react";
import type { Venue, RankedItem, RankStatus } from "../data/types";
import { useModalTrap } from "../hooks/useModalTrap";
import { X, MapPin, Heart, Calendar, Tag, Star, UtensilsCrossed, Sun, Moon, MessageSquare, ChevronRight, ChevronLeft } from "lucide-react";
import { statusLabel, statusColor } from "../data/mockData";

import { useToast } from "../context/ToastContext";

interface Props {
  venue: Venue;
  open: boolean;
  onClose: () => void;
  onAdd: (item: RankedItem) => void;
  existingStatus?: RankStatus;
}

type Step = "preview" | "experience" | "details";

export function VenueDetailModal({ venue, open, onClose, onAdd, existingStatus }: Props) {
  const modalRef = useRef<HTMLDivElement>(null);
  const toast = useToast();
  useModalTrap(open, onClose, modalRef);
  const [step, setStep] = useState<Step>("preview");
  const [occasion, setOccasion] = useState<RankedItem["occasion_tag"]>("solo");
  const [visited, setVisited] = useState(new Date().toISOString().slice(0, 10));
  const [classic, setClassic] = useState(false);
  const [status, setStatus] = useState<RankStatus>(existingStatus ?? "want_to_try");
  const [personalRating, setPersonalRating] = useState<number>(0);
  const [reaction, setReaction] = useState("");
  const [mealType, setMealType] = useState<"lunch" | "dinner" | undefined>(undefined);
  const [dishesInput, setDishesInput] = useState("");

  if (!open) return null;

  const handleAdd = () => {
    const dishes = dishesInput.split(",").map((d) => d.trim()).filter(Boolean);
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
    onAdd(item);
    toast.show("Saved to library", "success");
    onClose();
  };

  const statusOptions: RankStatus[] = ["want_to_try", "visited", "favourite", "regular"];

  const STEPS: { id: Step; label: string }[] = [
    { id: "preview", label: "Preview" },
    { id: "experience", label: "How was it?" },
    { id: "details", label: "Tell us more" },
  ];

  return (
    <div ref={modalRef} className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4 backdrop-blur-sm">
      <div className="flex max-h-[92vh] sm:max-h-[90vh] w-full sm:max-w-lg flex-col overflow-hidden rounded-t-3xl sm:rounded-3xl bg-paper shadow-elevated">
        {/* Step indicator */}
        <div className="flex items-center justify-between border-b border-cream-dark px-5 py-3">
          <div className="flex items-center gap-1">
            {STEPS.map((s, i) => (
              <div key={s.id} className="flex items-center gap-1">
                <button
                  onClick={() => setStep(s.id)}
                  className={`text-xs font-medium transition ${
                    step === s.id ? "text-sienna-600" : "text-ink-faint hover:text-ink-muted"
                  }`}
                >
                  {s.label}
                </button>
                {i < STEPS.length - 1 && <ChevronRight size={12} className="text-ink-faint" />}
              </div>
            ))}
          </div>
          <button onClick={onClose} className="rounded-full p-1 text-ink-faint hover:bg-cream hover:text-ink-muted transition" aria-label="Close">
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {/* STEP 1: Preview */}
          {step === "preview" && (
            <div>
              <div className="relative aspect-video">
                <img src={venue.image_url} alt={venue.name} className="h-full w-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                <div className="absolute bottom-4 left-4 right-4">
                  <h2 className="font-serif text-2xl text-white drop-shadow">{venue.name}</h2>
                  <p className="text-sm text-white/80">{venue.cuisines.join(" · ")}</p>
                </div>
              </div>
              <div className="p-5 space-y-4">
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
                <button onClick={() => setStep("experience")} className="btn-primary w-full gap-2">
                  How was it? <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: How was it? */}
          {step === "experience" && (
            <div className="p-5 space-y-6">
              <div>
                <h3 className="font-serif text-lg text-ink mb-3">How was it?</h3>
                <div className="grid grid-cols-2 gap-2">
                  {statusOptions.map((s) => (
                    <button
                      key={s}
                      onClick={() => setStatus(s)}
                      className={`rounded-xl px-3 py-3 text-xs font-medium ring-1 transition-all ${
                        status === s
                          ? statusColor(s)
                          : "bg-cream text-ink-muted ring-cream-dark hover:bg-cream-warm"
                      }`}
                    >
                      {statusLabel(s)}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-ink-muted">Your rating</label>
                <div className="flex items-center gap-1">
                  {[1,2,3,4,5].map((n) => (
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

              <div>
                <label className="mb-2 block text-sm font-medium text-ink-muted">Occasion</label>
                <div className="flex flex-wrap gap-2">
                  {["solo","date","business","group","comfort"].map((o) => (
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

              <div className="flex gap-3">
                <button onClick={() => setStep("preview")} className="btn-secondary flex-1 gap-1"><ChevronLeft size={14} /> Back</button>
                <button onClick={() => setStep("details")} className="btn-primary flex-1 gap-1">More details <ChevronRight size={14} /></button>
              </div>
            </div>
          )}

          {/* STEP 3: Tell us more */}
          {step === "details" && (
            <div className="p-5 space-y-5">
              <div>
                <h3 className="font-serif text-lg text-ink mb-4">Tell us more</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-ink-muted flex items-center gap-1"><Calendar size={12}/> Visited on</label>
                    <input type="date" value={visited} onChange={(e) => setVisited(e.target.value)} className="w-full rounded-xl border-cream-dark bg-cream px-3 py-2 text-sm shadow-sm focus:border-sienna-400 focus:ring-sienna-100" />
                  </div>
                  <div className="flex items-end">
                    <label className="flex items-center gap-2 text-sm text-ink-muted cursor-pointer rounded-xl border border-cream-dark bg-cream px-3 py-2 w-full">
                      <input type="checkbox" checked={classic} onChange={(e) => setClassic(e.target.checked)} className="rounded border-cream-dark accent-sienna-500" />
                      <Tag size={13} /> Classic
                    </label>
                  </div>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-ink-muted">Meal type</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setMealType(mealType === "lunch" ? undefined : "lunch")}
                    className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-medium ring-1 transition ${
                      mealType === "lunch" ? "bg-sienna-50 text-sienna-700 ring-sienna-200" : "bg-cream text-ink-muted ring-cream-dark hover:bg-cream-warm"
                    }`}
                  >
                    <Sun size={13} /> Lunch
                  </button>
                  <button
                    onClick={() => setMealType(mealType === "dinner" ? undefined : "dinner")}
                    className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-medium ring-1 transition ${
                      mealType === "dinner" ? "bg-sienna-50 text-sienna-700 ring-sienna-200" : "bg-cream text-ink-muted ring-cream-dark hover:bg-cream-warm"
                    }`}
                  >
                    <Moon size={13} /> Dinner
                  </button>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-ink-muted flex items-center gap-1"><UtensilsCrossed size={12}/> What you ate</label>
                <input
                  value={dishesInput}
                  onChange={(e) => setDishesInput(e.target.value)}
                  placeholder="Ramen, gyoza, beer..."
                  className="w-full rounded-xl border-cream-dark bg-cream px-3 py-2 text-sm shadow-sm transition focus:border-sienna-400 focus:outline-none focus:ring-2 focus:ring-sienna-100"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-ink-muted flex items-center gap-1"><MessageSquare size={12}/> Your take</label>
                <textarea
                  value={reaction}
                  onChange={(e) => setReaction(e.target.value)}
                  placeholder="A few words about the experience..."
                  rows={2}
                  className="w-full rounded-xl border-cream-dark bg-cream p-3 text-sm shadow-sm transition focus:border-sienna-400 focus:outline-none focus:ring-2 focus:ring-sienna-100"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={() => setStep("experience")} className="btn-secondary flex-1 gap-1"><ChevronLeft size={14} /> Back</button>
                <button onClick={handleAdd} className="btn-primary flex-1 gap-2"><Heart size={15}/> Save to Library</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
