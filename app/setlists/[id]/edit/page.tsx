'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { getSetlist, getSetlistVersions, reorderSetlist, removeFromSetlist, updateSetlistNombre } from '@/lib/queries';
import { Setlist, Version } from '@/lib/types';
import SortableSongRow from './SortableSongRow';

export default function EditarSetlistPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [setlist, setSetlist] = useState<Setlist | null>(null);
  const [versions, setVersions] = useState<Version[]>([]);
  const [loading, setLoading] = useState(true);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 8 } })
  );

  const load = useCallback(async () => {
    const sl = await getSetlist(id);
    const vs = await getSetlistVersions(id);
    setSetlist(sl);
    setVersions(vs);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function guardarNombre(nombre: string) {
    setSetlist((s) => (s ? { ...s, nombre } : s));
    await updateSetlistNombre(id, nombre);
  }

  async function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = versions.findIndex((v) => v.id === active.id);
    const newIndex = versions.findIndex((v) => v.id === over.id);
    const nuevo = arrayMove(versions, oldIndex, newIndex);
    setVersions(nuevo);
    await reorderSetlist(id, nuevo.map((v) => v.id));
  }

  async function quitar(versionId: string) {
    setVersions((vs) => vs.filter((v) => v.id !== versionId));
    await removeFromSetlist(id, versionId);
  }

  async function compartir() {
    const url = `${window.location.origin}/show/${id}`;
    const texto = `Setlist "${setlist?.nombre}" (${setlist?.id_corto}) — ${url}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: setlist?.nombre, text: texto, url });
      } catch {
        /* el usuario canceló el share, no hacemos nada */
      }
    } else {
      await navigator.clipboard.writeText(texto);
      alert('Link copiado (tu navegador no soporta compartir nativo).');
    }
  }

  if (loading || !setlist) return <div className="p-6 text-center text-muted">Cargando…</div>;

  return (
    <main className="max-w-md mx-auto p-4">
      <div className="flex items-center gap-2 mb-4">
        <button className="text-lg" onClick={() => router.push('/')}>
          ←
        </button>
        <input
          value={setlist.nombre}
          onChange={(e) => guardarNombre(e.target.value)}
          className="flex-1 text-lg font-semibold bg-transparent border-none focus:outline-none"
        />
        <span className="text-xs px-2 py-0.5 rounded-full bg-chip text-muted">{setlist.id_corto}</span>
      </div>

      <div className="flex flex-col gap-2 mb-4">
        <button
          className="w-full py-2.5 rounded-xl bg-accent text-white text-sm"
          onClick={() => router.push(`/show/${id}`)}
          disabled={versions.length === 0}
        >
          Abrir en modo show
        </button>
        <div className="flex gap-2">
          <button
            className="flex-1 py-2.5 rounded-xl border border-border text-sm"
            onClick={() => router.push(`/setlists/${id}/agregar`)}
          >
            + Agregar canción
          </button>
          <button className="flex-1 py-2.5 rounded-xl border border-border text-sm" onClick={compartir}>
            Compartir por WhatsApp
          </button>
        </div>
      </div>

      <div className="border border-border rounded-2xl p-4 bg-card mb-4">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-sm font-medium">Canciones</h2>
          <span className="text-xs text-muted">{versions.length} canciones</span>
        </div>

        {versions.length === 0 && (
          <div className="text-sm text-muted py-3">Sin canciones todavía.</div>
        )}

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={versions.map((v) => v.id)} strategy={verticalListSortingStrategy}>
            <div className="flex flex-col">
              {versions.map((v, i) => (
                <SortableSongRow
                  key={v.id}
                  version={v}
                  index={i}
                  onEditar={() => router.push(`/canciones/${v.id}/editar?setlistId=${id}&origen=setlist`)}
                  onQuitar={() => quitar(v.id)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </div>
    </main>
  );
}
