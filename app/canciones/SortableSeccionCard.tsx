'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { SeccionInput } from '@/lib/queries';

const TIPOS = ['intro', 'verso', 'precoro', 'coro', 'puente', 'solo', 'outro', 'otro'];

export type SeccionEditable = SeccionInput & {
  _key: string;
  confianza?: 'alta' | 'media' | 'baja';
};

export default function SortableSeccionCard({
  seccion,
  onCampo,
  onQuitar,
}: {
  seccion: SeccionEditable;
  onCampo: (campo: keyof SeccionInput, valor: string) => void;
  onQuitar: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: seccion._key,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={{ ...style, borderColor: seccion.confianza === 'baja' ? '#c17a3a' : 'var(--border)' }}
      className="border rounded-2xl p-3 bg-card"
    >
      <div className="flex items-center gap-2 mb-2">
        <select
          value={seccion.tipo}
          onChange={(e) => onCampo('tipo', e.target.value)}
          className="px-2 py-1 rounded-lg border border-border bg-bg text-sm"
        >
          {TIPOS.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        {seccion.confianza === 'baja' && (
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-chip text-muted">revisar acordes</span>
        )}
        <button className="ml-auto text-red-600 text-sm" onClick={onQuitar}>
          ×
        </button>
        <button
          {...attributes}
          {...listeners}
          className="w-7 h-7 rounded-full border border-border text-sm cursor-grab active:cursor-grabbing touch-none flex-shrink-0"
          aria-label="Arrastrar para reordenar esta sección"
        >
          ⠿
        </button>
      </div>
      <label className="block text-xs text-muted mb-1">Etiqueta</label>
      <input
        value={seccion.etiqueta}
        onChange={(e) => onCampo('etiqueta', e.target.value)}
        className="w-full mb-2 px-3 py-2 rounded-lg border border-border bg-bg text-sm"
      />
      <label className="block text-xs text-muted mb-1">
        Acordes (ej. "C   Bb E F" — más espacios entre dos = el primero dura más)
      </label>
      <input
        value={seccion.acordesTexto}
        onChange={(e) => onCampo('acordesTexto', e.target.value)}
        className="w-full mb-2 px-3 py-2 rounded-lg border border-border bg-bg text-sm"
      />
      <label className="block text-xs text-muted mb-1">Letra (opcional, modo vocalista)</label>
      <textarea
        value={seccion.letra}
        onChange={(e) => onCampo('letra', e.target.value)}
        rows={2}
        className="w-full px-3 py-2 rounded-lg border border-border bg-bg text-sm"
      />
    </div>
  );
}
