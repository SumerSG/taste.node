import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useState } from "react";
import type { TasteProfile, RankedItem, Venue, RankStatus } from "../data/types";
import { removeRankedItem, updateItemStatus } from "../data/api";
import { getClusterLabel, statusLabel, statusColor } from "../data/mockData";
import { VenueDetailModal } from "../components/VenueDetailModal";
import { GripVertical, Trash2, ChevronUp, ChevronDown, Plus, Sparkles, ListOrdered } from "lucide-react";

interface Props {
  profile: TasteProfile;
  onProfileChange: (p: TasteProfile) => void;
  onNavigateToLibrary: () => void;
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
    <div ref={setNodeRef} style={style} className="group flex items-center gap-3 rounded-2xl border border-surface-200 bg-white p-3 shadow-sm transition hover:shadow-card">
      {/* Position number */}
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-xs font-bold text-brand-700">#{index + 1}</div>
      {/* Drag handle */}
      <button {...(sensorsEnabled ? attributes : {})} {...(sensorsEnabled ? listeners : {})} className="cursor-grab text-surface-300 hover:text-surface-500">
        <GripVertical size={16} />
      </button>
      {/* Photo */}
      <div className="shrink-0 cursor-pointer overflow-hidden rounded-xl" onClick={onClick}>
        <img src={item.venue.image_url} alt={item.venue.name} className="h-14 w-14 object-cover" loading="lazy" />
      </div>
      {/* Info */}
      <div className="min-w-0 flex-1 cursor-pointer" onClick={onClick}>
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-bold text-surface-900">{item.venue.name}</span>
          {item.is_classic && <span className="shrink-0 rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold uppercase text-amber-700">Classic</span>}
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
        <button onClick={onMoveUp} className="rounded p-1 text-surface-400 hover:bg-surface-100"><ChevronUp size={14} /></button>
        <button onClick={onMoveDown} className="rounded p-1 text-surface-400 hover:bg-surface-100"><ChevronDown size={14} /></button>
      </div>
      {/* Remove */}
      <button onClick={onRemove} className="rounded p-1.5 text-surface-400 hover:bg-red-50 hover:text-red-500 transition">
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
      <div className="flex items-center gap-3 rounded-2xl border border-brand-200 bg-brand-50 px-5 py-4 shadow-sm">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-500 text-white">
          <Sparkles size={18} />
        </div>
        <div>
          <div className="text-xs font-bold uppercase tracking-widest text-brand-600">Taste Cluster</div>
          <div className="text-lg font-bold text-surface-900">{cluster.label}</div>
          <div className="text-sm text-brand-600">{cluster.tagline}</div>
        </div>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-surface-900">My Ranking</h2>
          <p className="text-sm text-surface-500">Drag to reorder. Up/down arrows nudge. Status updates taste signal.</p>
        </div>
        <button onClick={onNavigateToLibrary} className="btn-primary gap-2 text-sm">
          <Plus size={15} /> Add from Search
        </button>
      </div>

      {/* List */}
      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-surface-200 py-20 text-center">
          <ListOrdered size={40} className="mb-3 text-surface-300" />
          <p className="text-lg font-semibold text-surface-600">Your ranking is empty</p>
          <p className="text-sm text-surface-400 mt-1">Browse Search and add places you love.</p>
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
