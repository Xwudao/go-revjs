import type { ReactNode } from 'react'
import clsx from 'clsx'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import classes from './sortable-list.module.scss'

// ── Public types ─────────────────────────────────────────────────────────────

export interface SortableItem {
  /** Stable unique key used as the dnd-kit id. */
  uid: string
}

export interface SortableListProps<T extends SortableItem> {
  items: T[]
  onReorder: (items: T[]) => void
  renderItem: (item: T, index: number) => ReactNode
  /** Extra class applied to each row wrapper. */
  itemClassName?: string
}

// ── Internal row ─────────────────────────────────────────────────────────────

interface RowProps<T extends SortableItem> {
  item: T
  index: number
  renderItem: (item: T, index: number) => ReactNode
  itemClassName?: string
}

function SortableRow<T extends SortableItem>({
  item,
  index,
  renderItem,
  itemClassName,
}: RowProps<T>) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({
      id: item.uid,
    })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={clsx(classes.item, isDragging && classes.dragging, itemClassName)}
    >
      {/* Drag handle */}
      <span
        className={classes.drag}
        {...attributes}
        {...listeners}
        aria-label="拖拽排序"
        title="拖拽排序"
      >
        <span className="i-mdi-drag-vertical" aria-hidden="true" />
      </span>

      {renderItem(item, index)}
    </div>
  )
}

// ── Public component ─────────────────────────────────────────────────────────

export function SortableList<T extends SortableItem>({
  items,
  onReorder,
  renderItem,
  itemClassName,
}: SortableListProps<T>) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = items.findIndex((i) => i.uid === active.id)
    const newIndex = items.findIndex((i) => i.uid === over.id)
    if (oldIndex < 0 || newIndex < 0) return
    onReorder(arrayMove(items, oldIndex, newIndex))
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={items.map((i) => i.uid)}
        strategy={verticalListSortingStrategy}
      >
        {items.map((item, idx) => (
          <SortableRow
            key={item.uid}
            item={item}
            index={idx}
            renderItem={renderItem}
            itemClassName={itemClassName}
          />
        ))}
      </SortableContext>
    </DndContext>
  )
}
