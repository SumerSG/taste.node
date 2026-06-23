import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useState } from "react";
import type { TasteProfile, RankedItem, Venue, RankStatus } from "../data/types";
import { removeRankedItem, updateItemStatus } from "../data/api";
import { getClusterLabel, statusLabel, statusColor } from "../data/mockData";
import { VenueDetailModal } from "../components/VenueDetailModal";
import { GripVertical, Trash2, ChevronUp, ChevronDown, Plus, ListOrdered } from "lucide-react";

interface Props {
  profile: TasteProfile;
  onProfileChange: (p: TasteProfile) => void;
  onNavigateToLibrary: () => void;
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
  item, index, onRemove, onMoveUp, onMoveDown, onStatusChange, onClick, sensorsEnabled,
}: {
  item: RankedItem;
  index: number;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onStatusChange: (s: RankStatus) => void;
  onClick: () => void;
  sensorsEnabled: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.venue.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group relative flex items-center gap-3 rounded-2xl border border-cream-dark bg-paper p-3 shadow-sm transition hover:shadow-card"
    >
      {/* Left gradient accent line */}
      <div className={`absolute left-0 top-3 bottom-3 w-[3px] rounded-full bg-gradient-to-b ${rankAccentClass(index)}`} />

      {/* Position number */}
      <div className={`ml-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-bold ring-1 ${rankNumberStyle(index)}`}>
        {index + 1}
      </div>

      {/* Drag handle */}
      <button {...(sensorsEnabled ? attributes : {})} {...(sensorsEnabled ? listeners : {})} className="cursor-grab text-ink-faint hover:text-ink-muted">
        <GripVertical size={16} />
      </button>

      {/* Photo */}
      <div className="shrink-0 cursor-pointer overflow-hidden rounded-xl" onClick={onClick}>
        <img src={item.venue.image_url} alt={item.venue.name} className="h-14 w-14 object-cover" loading="lazy" />
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1 cursor-pointer" onClick={onClick}>
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-semibold text-ink">{item.venue.name}</span>
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

      {/* Status selector */}
      <div className="hidden sm:block">
        <select
          value={item.status ?? "visited"}
          onChange={(e) => onStatusChange(e.target.value as RankStatus)}
          className={`rounded-lg px-2 py-1 text-xs font-medium ring-1 outline-none ${statusColor(item.status)}`}
        >
          {["want_to_try", "visited", "favourite", "regular"].map((s) => (
            <option key={s} value={s}>{statusLabel(s as RankStatus)}</option>
          ))}
        </select>
      </div>

      {/* Reorder buttons */}
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition">
        <button onClick={onMoveUp} className="rounded p-1 text-ink-faint hover:bg-cream"><ChevronUp size={14} /></button>
        <button onClick={onMoveDown} className="rounded p-1 text-ink-faint hover:bg-cream"><ChevronDown size={14} /></button>
      </div>

      {/* Remove */}
      <button onClick={onRemove} className="rounded p-1.5 text-ink-faint hover:bg-red-50 hover:text-red-500 transition">
        <Trash2 size={14} />
      </button>
    </div>
  );
}

export function RankingView({ profile, onProfileChange, onNavigateToLibrary }: Props) {
  const items = profile.contexts[profile.default_context].ranked_list;
  const [dragEnabled] = useState(true);
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);
  const cluster = getClusterLabel(profile);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex((i) => i.venue.id === active.id);
      const newIndex = items.findIndex((i) => i.venue.id === over.id);
      const newList = arrayMove(items, oldIndex, newIndex);
      import("../data/api").then(({ updateRankedList }) => {
        onProfileChange(updateRankedList(profile, newList));
      });
    }
  };

  const move = (index: number, dir: number) => {
    const newIndex = index + dir;
    if (newIndex < 0 || newIndex >= items.length) return;
    const newList = arrayMove(items, index, newIndex);
    import("../data/api").then(({ updateRankedList }) => {
      onProfileChange(updateRankedList(profile, newList));
    });
  };

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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-serif text-2xl text-ink">My Ranking</h2>
          <p className="text-sm text-ink-faint">Drag to reorder. Up/down arrows nudge. Status updates taste signal.</p>
        </div>
        <button onClick={onNavigateToLibrary} className="btn-primary gap-2 text-sm">
          <Plus size={15} /> Add from Search
        </button>
      </div>

      {/* List */}
      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-cream-dark py-20 text-center">
          <ListOrdered size={40} className="mb-3 text-ink-faint" />
          <p className="font-serif text-lg text-ink-muted">Your ranking is empty</p>
          <p className="text-sm text-ink-faint mt-1">Browse Search and add places you love.</p>
          <button onClick={onNavigateToLibrary} className="btn-primary mt-4 gap-2"><Plus size={15} /> Browse Search</button>
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
                  onRemove={() => onProfileChange(removeRankedItem(profile, item.venue.id))}
                  onMoveUp={() => move(idx, -1)}
                  onMoveDown={() => move(idx, 1)}
                  onStatusChange={(s) => onProfileChange(updateItemStatus(profile, item.venue.id, s))}
                  onClick={() => setSelectedVenue(item.venue)}
                  sensorsEnabled={dragEnabled}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {selectedVenue && (
        <VenueDetailModal
          venue={selectedVenue}
          open={!!selectedVenue}
          onClose={() => setSelectedVenue(null)}
          onAdd={(item) => {
            import("../data/api").then(({ addRankedItem }) => {
              onProfileChange(addRankedItem(profile, item));
              setSelectedVenue(null);
            });
          }}
        />
      )}
    </div>
  );
}
