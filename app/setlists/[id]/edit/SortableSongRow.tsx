'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Pencil, X, GripVertical } from 'lucide-react';
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
        className="w-9 h-9 rounded-2xl border border-border flex items-center justify-center flex-shrink-0"
        onClick={onEditar}
        title="Editar acordes de esta canción"
      >
        <Pencil size={16} />
      </button>
      <button
        className="w-9 h-9 rounded-2xl border border-border flex items-center justify-center flex-shrink-0"
        style={{ color: 'var(--text-danger, #a32d2d)' }}
        onClick={onQuitar}
      >
        <X size={16} />
      </button>
      {/* Manija de arrastre: área táctil más grande para que sea fácil de agarrar */}
      <button
        {...attributes}
        {...listeners}
        className="w-9 h-9 rounded-2xl border border-border flex items-center justify-center flex-shrink-0 cursor-grab active:cursor-grabbing touch-none"
        aria-label="Arrastrar para reordenar"
      >
        <GripVertical size={16} />
      </button>
    </div>
  );
}
