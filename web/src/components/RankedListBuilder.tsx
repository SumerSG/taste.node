
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, X, ChevronUp, ChevronDown, Plus } from "lucide-react";
import type { RankedItem, TasteProfile } from "../data/types";
import { updateRankedList, removeRankedItem } from "../data/api";

interface Props {
  profile: TasteProfile;
  onProfileChange: (p: TasteProfile) => void;
  onAddNew: () => void;
}

function SortableRow({ item, index, onRemove, onMoveUp, onMoveDown }: {
  item: RankedItem;
  index: number;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.venue.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
      <button {...attributes} {...listeners} className="cursor-grab text-gray-400 hover:text-gray-600">
        <GripVertical size={18} />
      </button>
      <div className="flex flex-1 flex-col">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-900">{item.venue.name}</span>
          {item.is_classic && (
            <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-amber-700">Classic</span>
          )}
        </div>
        <div className="text-sm text-gray-500">
          {item.venue.cuisines.join(", ")} · {item.occasion_tag}
        </div>
      </div>
      <div className="flex items-center gap-1">
        <button onClick={onMoveUp} className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700">
          <ChevronUp size={16} />
        </button>
        <button onClick={onMoveDown} className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700">
          <ChevronDown size={16} />
        </button>
      </div>
      <div className="w-8 text-right text-sm font-medium text-gray-400">#{index + 1}</div>
      <button onClick={onRemove} className="text-gray-400 hover:text-red-500">
        <X size={16} />
      </button>
    </div>
  );
}

export function RankedListBuilder({ profile, onProfileChange, onAddNew }: Props) {
  const items = profile.contexts[profile.default_context].ranked_list;

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex((i) => i.venue.id === active.id);
      const newIndex = items.findIndex((i) => i.venue.id === over.id);
      const newList = arrayMove(items, oldIndex, newIndex);
      onProfileChange(updateRankedList(profile, newList));
    }
  };

  const move = (index: number, dir: number) => {
    const newIndex = index + dir;
    if (newIndex < 0 || newIndex >= items.length) return;
    const newList = arrayMove(items, index, newIndex);
    onProfileChange(updateRankedList(profile, newList));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Your Top Restaurants</h2>
        <button
          onClick={onAddNew}
          className="flex items-center gap-1 rounded-lg bg-orange-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-orange-700"
        >
          <Plus size={16} /> Add place
        </button>
      </div>
      {items.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-gray-200 p-8 text-center text-gray-500">
          Your list is empty. Add a few favourite restaurants to see your cluster.
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
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}
