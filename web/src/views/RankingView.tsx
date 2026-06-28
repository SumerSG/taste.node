import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useState } from "react";
import type { TasteProfile, RankedItem, Venue, RankStatus } from "../data/types";
import { removeRankedItem, updateItemStatus, updateRankedList, addRankedItem, switchContext, createContext, deleteContext, displayContextName, moveItemToContext, ensureContext } from "../data/api";
import { getClusterLabel, statusLabel, statusColor } from "../data/mockData";
import { VenueDetailModal } from "../components/VenueDetailModal";
import { Trash2, ChevronUp, ChevronDown, Plus, ListOrdered, ExternalLink, FolderPlus, X, FolderOpen, ArrowRight } from "lucide-react";

import { useToast } from "../context/ToastContext";

interface Props {
  profile: TasteProfile;
  onProfileChange: (p: TasteProfile) => void;
  onNavigateToSearch: () => void;
  onNavigateToLibrary: () => void;
  onNavigateToVenue?: (v: Venue) => void;
}

function rankAccentClass(index: number) {
  if (index === 0) return "from-sienna-400 to-sienna-600";
  if (index === 1) return "from-olive-400 to-olive-600";
  if (index === 2) return "from-ink-muted to-ink-faint";
  return "from-surface-300 to-surface-200";
}

function rankNumberStyle(index: number) {
  if (index === 0) return "bg-sienna-50 text-sienna-700 ring-sienna-200";
  if (index === 1) return "bg-olive-50 text-olive-700 ring-olive-200";
  if (index === 2) return "bg-cream text-ink-muted ring-cream-dark";
  return "bg-cream text-ink-faint ring-transparent";
}

function SortableRow({
  item, index, contextId, onRemove, onMoveUp, onMoveDown, onStatusChange, onAddToLibrary, onClick, onNavigateToVenue,
}: {
  item: RankedItem;
  index: number;
  contextId: string;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onStatusChange: (s: RankStatus) => void;
  onAddToLibrary?: () => void;
  onClick: () => void;
  onNavigateToVenue?: (v: Venue) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.venue.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group relative flex items-center gap-3 rounded-2xl border border-cream-dark bg-paper p-3 shadow-sm transition hover:shadow-card cursor-grab active:cursor-grabbing"
      {...attributes}
      {...listeners}
    >
      {/* Left gradient accent line */}
      <div className={`absolute left-0 top-3 bottom-3 w-[3px] rounded-full bg-gradient-to-b ${rankAccentClass(index)}`} />

      {/* Remove */}
      <button onClick={onRemove} onPointerDown={(e) => e.stopPropagation()} className="rounded-lg p-2 text-ink-faint hover:bg-red-50 hover:text-red-500 transition min-h-[32px] min-w-[32px] flex items-center justify-center" aria-label="Remove">
        <Trash2 size={14} />
      </button>

      {/* Position number */}
      <div className={`ml-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-bold ring-1 ${rankNumberStyle(index)}`}>
        {index + 1}
      </div>

      {/* Photo */}
      <div className="shrink-0 cursor-pointer overflow-hidden rounded-xl" onPointerDown={(e) => e.stopPropagation()} onClick={onClick}>
        <img src={item.venue.image_url} alt={item.venue.name} className="h-14 w-14 object-cover" loading="lazy" />
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span
            className={`truncate text-sm font-semibold text-ink ${onNavigateToVenue ? "cursor-pointer hover:text-sienna-600" : ""}`}
            onClick={() => onNavigateToVenue?.(item.venue)}
          >
            {item.venue.name}
          </span>
          {item.venue.source_url && (
            <a
              href={item.venue.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 rounded p-0.5 text-ink-faint hover:text-sienna-600 transition"
              title="Open restaurant page"
              aria-label="Open restaurant page"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLink size={13} />
            </a>
          )}
          {item.is_classic && (
            <span className="shrink-0 -rotate-6 rounded-sm border border-sienna-300 bg-sienna-50 px-1 py-0.5 text-[9px] font-black uppercase tracking-tight text-sienna-700">
              Classic
            </span>
          )}
        </div>
        <div className="mt-0.5 flex flex-wrap gap-1">
          {item.venue.cuisines.slice(0, 3).map((c) => (
            <span key={c} className="chip">{c}</span>
          ))}
        </div>
      </div>

      {/* Action column: Add to Library in wishlist, else status selector */}
      <div className="hidden sm:block" onPointerDown={(e) => e.stopPropagation()}>
        {contextId === "wishlist" ? (
          <button
            onClick={onAddToLibrary}
            className="flex items-center gap-1 rounded-lg bg-sienna-50 px-2 py-1 text-xs font-medium text-sienna-700 ring-1 ring-sienna-200 hover:bg-sienna-100 transition"
          >
            <Plus size={12} />
            Add to library
          </button>
        ) : (
          <select
            value={item.status ?? "visited"}
            onChange={(e) => onStatusChange(e.target.value as RankStatus)}
            className={`rounded-lg px-2 py-1 text-xs font-medium ring-1 outline-none ${statusColor(item.status)}`}
          >
            {(["visited", "favourite", "not_for_me"] as RankStatus[]).map((s) => (
              <option key={s} value={s}>{statusLabel(s)}</option>
            ))}
          </select>
        )}
      </div>

      {/* Reorder buttons */}
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition" onPointerDown={(e) => e.stopPropagation()}>
        <button onClick={onMoveUp} className="rounded p-1 text-ink-faint hover:bg-cream" aria-label="Move up"><ChevronUp size={14} /></button>
        <button onClick={onMoveDown} className="rounded p-1 text-ink-faint hover:bg-cream" aria-label="Move down"><ChevronDown size={14} /></button>
      </div>
    </div>
  );
}

export function RankingView({ profile, onProfileChange, onNavigateToSearch, onNavigateToLibrary, onNavigateToVenue }: Props) {
  const toast = useToast();
  const activeCtx = profile.default_context;
  // In non-wishlist contexts, filter out items with status === "wishlist"
  const items = (profile.contexts[activeCtx]?.ranked_list ?? []).filter(
    (item) => activeCtx === "wishlist" || item.status !== "wishlist"
  );
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);
  const [showNewList, setShowNewList] = useState(false);
  const [newListName, setNewListName] = useState("");
  const cluster = getClusterLabel(profile);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex((i) => i.venue.id === active.id);
      const newIndex = items.findIndex((i) => i.venue.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;
      const newList = arrayMove(items, oldIndex, newIndex);
      onProfileChange(updateRankedList(profile, newList, activeCtx));
    }
  };

  const move = (index: number, dir: number) => {
    const newIndex = index + dir;
    if (newIndex < 0 || newIndex >= items.length) return;
    const newList = arrayMove(items, index, newIndex);
    onProfileChange(updateRankedList(profile, newList, activeCtx));
  };

  const handleCreateList = () => {
    const name = newListName.trim().toLowerCase().replace(/\s+/g, "_");
    if (!name || profile.contexts[name]) return;
    onProfileChange(createContext(profile, name));
    toast.show("List created", "success");
    setNewListName("");
    setShowNewList(false);
  };

  // Build ordered option list: default & wishlist always first, then custom lists A-Z
  const customContexts = Object.keys(profile.contexts)
    .filter((id) => id !== "default" && id !== "wishlist")
    .sort();
  const contextOptions = ["default", "wishlist", ...customContexts];

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      {/* Cluster banner */}
      <div className="flex items-center gap-3 rounded-2xl border border-olive-200 bg-olive-50 px-5 py-4 shadow-sm">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-widest text-olive-600">Taste Cluster</div>
          <div className="font-serif text-lg text-ink">{cluster.label}</div>
          <div className="text-sm text-olive-600">{cluster.tagline}</div>
        </div>
      </div>

      {/* Header */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FolderOpen size={18} className="text-ink-muted" />
            <select
              value={activeCtx}
              onChange={(e) => onProfileChange(ensureContext(profile, e.target.value))}
              className="rounded-lg border border-cream-dark bg-cream px-3 py-1.5 text-sm font-medium text-ink shadow-sm focus:border-sienna-400 focus:outline-none focus:ring-2 focus:ring-sienna-100"
            >
              {contextOptions.map((id) => (
                <option key={id} value={id}>{displayContextName(id)}</option>
              ))}
            </select>
            {activeCtx !== "default" && activeCtx !== "wishlist" && (
              <button
                onClick={() => {
                  if (window.confirm("Delete this list and all its restaurants?")) {
                    onProfileChange(deleteContext(profile, activeCtx));
                    toast.show("List deleted", "success");
                  }
                }}
                className="rounded p-1 text-ink-faint hover:bg-red-50 hover:text-red-500 transition"
                title="Delete this list"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
                  }
                }}
                className="rounded p-1 text-ink-faint hover:bg-red-50 hover:text-red-500 transition"
                title="Delete this list"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onNavigateToSearch} className="btn-primary gap-2 text-sm">
              <Plus size={15} /> Add from Search
            </button>
            <button onClick={onNavigateToLibrary} className="btn-secondary gap-2 text-sm">
              <Plus size={15} /> Add from Library
            </button>
          </div>
        </div>

        {showNewList ? (
          <div className="flex items-center gap-2">
            <input
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              placeholder="List name (e.g. Fav Cafes)"
              className="flex-1 rounded-lg border border-cream-dark bg-cream px-3 py-1.5 text-sm shadow-sm focus:border-sienna-400 focus:outline-none focus:ring-2 focus:ring-sienna-100"
              onKeyDown={(e) => { if (e.key === "Enter") handleCreateList(); if (e.key === "Escape") setShowNewList(false); }}
              autoFocus
            />
            <button onClick={handleCreateList} className="btn-primary text-xs px-3 py-1.5">Create</button>
            <button onClick={() => setShowNewList(false)} className="rounded p-1 text-ink-faint hover:bg-cream" aria-label="Cancel"><X size={14} /></button>
          </div>
        ) : (
          <button onClick={() => setShowNewList(true)} className="flex items-center gap-1.5 text-xs font-medium text-sienna-600 hover:text-sienna-700 transition">
            <FolderPlus size={13} /> New personal list
          </button>
        )}

        <h2 className="font-serif text-2xl text-ink">{displayContextName(activeCtx)}</h2>
        <p className="text-sm text-ink-faint">Drag anywhere to reorder. Up/down arrows nudge. Status updates taste signal.</p>
      </div>

      {/* List */}
      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-cream-dark py-20 text-center">
          <ListOrdered size={40} className="mb-3 text-ink-faint" />
          <p className="font-serif text-lg text-ink-muted">Your ranking is empty</p>
          <p className="text-sm text-ink-faint mt-1">Browse Search and add places you love.</p>
          <button onClick={onNavigateToSearch} className="btn-primary mt-4 gap-2"><Plus size={15} /> Browse Search</button>
          <button onClick={onNavigateToLibrary} className="btn-secondary mt-2 gap-2"><Plus size={15} /> Browse Library</button>
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={items.map((i) => i.venue.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {items.map((item, idx) => (
                <SortableRow
                  key={item.venue.id}
                  item={item}
                  index={idx}
                  contextId={activeCtx}
                  onRemove={() => {
                    if (!window.confirm("Remove this restaurant from your ranking?")) return;
                    onProfileChange(removeRankedItem(profile, item.venue.id, activeCtx));
                    toast.show("Removed from ranking", "success");
                  }}
                  onMoveUp={() => move(idx, -1)}
                  onMoveDown={() => move(idx, 1)}
                  onStatusChange={(s) => onProfileChange(updateItemStatus(profile, item.venue.id, s, activeCtx))}
                  onAddToLibrary={() => {
                    const next = moveItemToContext(profile, item.venue.id, "wishlist", "default", { status: "visited" });
                    onProfileChange(next);
                    toast.show("Added to library", "success");
                  }}
                  onClick={() => setSelectedVenue(item.venue)}
                  onNavigateToVenue={onNavigateToVenue}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {selectedVenue && (
        <VenueDetailModal
          venue={selectedVenue}
          profile={profile}
          open={!!selectedVenue}
          onClose={() => setSelectedVenue(null)}
          onAdd={(item, contextId) => {
            let p = profile;
            if (!p.contexts[contextId]) {
              p = createContext(p, contextId);
            }
            onProfileChange(addRankedItem(p, item, undefined, contextId));
            setSelectedVenue(null);
          }}
        />
      )}
    </div>
  );
}
