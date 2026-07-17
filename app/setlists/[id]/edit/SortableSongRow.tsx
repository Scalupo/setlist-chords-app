'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Version } from '@/lib/types';

export default function SortableSongRow({
  version,
  index,
  onEditar,
  onQuitar,
}: {
  version: Version;
  index: number;
  onEditar: () => void;
  onQuitar: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: version.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 py-2 border-b border-border last:border-none bg-card"
    >
      <span className="text-xs text-muted w-4">{index + 1}.</span>
      <div className="flex-1">
        <strong className="text-sm">{version.canciones.titulo}</strong>{' '}
        <span className="text-xs text-muted">{version.canciones.artista}</span>{' '}
        <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-chip text-muted">
          {version.etiqueta_version}
        </span>
      </div>
      <button
        className="w-7 h-7 rounded-full border border-border text-xs flex-shrink-0"
        onClick={onEditar}
        title="Editar acordes de esta canción"
      >
        ✏️
      </button>
      <button
        className="w-7 h-7 rounded-full border border-border text-xs text-red-600 flex-shrink-0"
        onClick={onQuitar}
      >
        ×
      </button>
      {/* Manija de arrastre: área táctil más grande para que sea fácil de agarrar */}
      <button
        {...attributes}
        {...listeners}
        className="w-8 h-8 rounded-full border border-border text-sm flex-shrink-0 cursor-grab active:cursor-grabbing touch-none"
        aria-label="Arrastrar para reordenar"
      >
        ⠿
      </button>
    </div>
  );
}
