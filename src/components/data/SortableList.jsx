import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { restrictToParentElement, restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";

import { cn } from "../../lib/cn.js";

/**
 * Drag-to-reorder over a list of `{ id }` items.
 *
 * The keyboard sensor is not optional: reordering is the one interaction in this
 * dashboard that is trivially mouse-only by accident, and §18 requires AA. Every
 * handle is a real button reachable by tab, with dnd-kit announcing moves.
 */
export function SortableList({ items, onReorder, children, className }) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragEnd({ active, over }) {
    if (!over || active.id === over.id) return;

    const from = items.findIndex((item) => item.id === active.id);
    const to = items.findIndex((item) => item.id === over.id);
    if (from === -1 || to === -1) return;

    // Indices come along so react-hook-form callers can use useFieldArray's
    // move(), which preserves field registration instead of re-creating rows.
    onReorder(arrayMove(items, from, to), from, to);
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[restrictToVerticalAxis, restrictToParentElement]}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
        <ul className={className}>{items.map((item, index) => children(item, index))}</ul>
      </SortableContext>
    </DndContext>
  );
}

export function SortableRow({ id, className, children }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "flex items-center gap-3 bg-surface",
        isDragging && "relative z-10 shadow-raised",
        className,
      )}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label="Reorder"
        className="shrink-0 cursor-grab touch-none rounded-sm p-1 text-ink-subtle hover:text-ink active:cursor-grabbing"
      >
        <GripVertical size={16} strokeWidth={1.75} aria-hidden="true" />
      </button>

      {children}
    </li>
  );
}
