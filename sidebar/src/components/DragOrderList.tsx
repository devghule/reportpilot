import { useState } from 'react';

interface DragOrderListProps {
  items: string[];
  onChange: (items: string[]) => void;
  labelFor: (key: string) => string;
}

// Native HTML5 drag-and-drop reordering — no external DnD library, per the
// project's "no UI library" constraint. Used for column order in the
// Template Builder: drag a chip up/down to change left-to-right sheet order.
export function DragOrderList({ items, onChange, labelFor }: DragOrderListProps) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const handleDrop = (targetIndex: number) => {
    if (draggedIndex === null || draggedIndex === targetIndex) return;
    const next = [...items];
    const [moved] = next.splice(draggedIndex, 1);
    next.splice(targetIndex, 0, moved);
    onChange(next);
    setDraggedIndex(null);
  };

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  if (items.length === 0) {
    return <p className="muted small">Add metrics or dimensions above to set column order.</p>;
  }

  return (
    <ul className="drag-order-list">
      {items.map((key, index) => (
        <li
          key={key}
          className={`drag-order-item${draggedIndex === index ? ' dragging' : ''}`}
          draggable
          onDragStart={() => setDraggedIndex(index)}
          onDragOver={(e) => e.preventDefault()}
          onDrop={() => handleDrop(index)}
          onDragEnd={() => setDraggedIndex(null)}
        >
          <span className="drag-handle" aria-hidden="true">⠿</span>
          <span style={{ flex: 1 }}>{labelFor(key)}</span>
          {/* Mouse-only drag-and-drop has no keyboard equivalent — these
              buttons make column reordering usable without a mouse. */}
          <button
            type="button"
            className="btn btn-link"
            disabled={index === 0}
            onClick={() => move(index, -1)}
            aria-label={`Move ${labelFor(key)} up`}
          >
            ↑
          </button>
          <button
            type="button"
            className="btn btn-link"
            disabled={index === items.length - 1}
            onClick={() => move(index, 1)}
            aria-label={`Move ${labelFor(key)} down`}
          >
            ↓
          </button>
        </li>
      ))}
    </ul>
  );
}
