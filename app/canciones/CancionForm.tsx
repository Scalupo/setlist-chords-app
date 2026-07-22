'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import {
  createCancionVersion,
  updateCancionVersion,
  getVersionCompleta,
  SeccionInput,
} from '@/lib/queries';
import { chordToLabel, parseChordToken, transposeChord, acordesToLinea, parseAcordesLinea } from '@/lib/chords';
import SortableSeccionCard, { SeccionEditable } from './SortableSeccionCard';

const TIPOS = ['intro', 'verso', 'precoro', 'coro', 'puente', 'solo', 'outro', 'otro'];

let contadorId = 0;
function generarKey() {
  contadorId += 1;
  return `sec-${contadorId}-${Math.random().toString(36).slice(2, 7)}`;
}

function InsertarAqui({ onClick }: { onClick: () => void }) {
  return (
    <div className="flex justify-center py-1">
      <button
        onClick={onClick}
        className="w-6 h-6 rounded-full border border-dashed border-border text-muted text-sm flex items-center justify-center hover:bg-chip"
        title="Insertar sección aquí"
      >
        +
      </button>
    </div>
  );
}

export default function CancionForm({
  versionIdToEdit,
  setlistId,
  origen,
}: {
  versionIdToEdit?: string;
  setlistId?: string;
  origen?: 'show' | 'setlist' | null;
}) {
  const router = useRouter();
  const modoEdicion = Boolean(versionIdToEdit);

  function volverAqui() {
    if (modoEdicion && origen === 'show' && setlistId) {
      router.push(`/show/${setlistId}?resume=${versionIdToEdit}`);
    } else if (modoEdicion && origen === 'setlist' && setlistId) {
      router.push(`/setlists/${setlistId}/edit`);
    } else if (modoEdicion) {
      router.push('/canciones');
    } else {
      router.push(setlistId ? `/setlists/${setlistId}/agregar` : '/');
    }
  }

  const [cargando, setCargando] = useState(modoEdicion);
  const [titulo, setTitulo] = useState('');
  const [artista, setArtista] = useState('');
  const [etiquetaVersion, setEtiquetaVersion] = useState('Estudio');
  const [tono, setTono] = useState('');
  const [secciones, setSecciones] = useState<SeccionEditable[]>([]);
  const [guardando, setGuardando] = useState(false);
  const [buscandoIA, setBuscandoIA] = useState(false);
  const [urlReferencia, setUrlReferencia] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notaIA, setNotaIA] = useState<string | null>(null);

  const seccionSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 8 } })
  );

  useEffect(() => {
    if (!versionIdToEdit) return;
    getVersionCompleta(versionIdToEdit).then((v) => {
      if (!v) {
        setError('No se encontró esta canción.');
        setCargando(false);
        return;
      }
      setTitulo(v.canciones.titulo);
      setArtista(v.canciones.artista);
      setEtiquetaVersion(v.etiqueta_version);
      setTono(v.tono_original || '');
      setSecciones(
        v.secciones.map((s) => ({
          _key: generarKey(),
          tipo: s.tipo,
          etiqueta: s.etiqueta,
          acordesTexto: acordesToLinea(s.acordes),
          letra: s.letra || '',
        }))
      );
      setCargando(false);
    });
  }, [versionIdToEdit]);

  async function buscarConIA() {
    if (!titulo.trim()) {
      setError('Escribe al menos el título antes de buscar con IA.');
      return;
    }
    setBuscandoIA(true);
    setError(null);
    setNotaIA(null);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 115000);
      const res = await fetch('/api/generar-acordes', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ titulo, artista, version: etiquetaVersion, link: urlReferencia }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      const data = await res.json();
      if (!res.ok) {
        setError(data.detail ? `${data.error}\n${data.detail}` : data.error || 'No se pudo generar el borrador con IA.');
        return;
      }
      if (!data.encontrada) {
        setNotaIA('La IA no encontró esta canción/versión. Captura los acordes manualmente abajo.');
        return;
      }
      if (data.tono_original && !tono) setTono(data.tono_original);
      const nuevasSecciones: SeccionEditable[] = (data.secciones || []).map((s: any) => ({
        _key: generarKey(),
        tipo: TIPOS.includes(s.tipo) ? s.tipo : 'otro',
        etiqueta: s.etiqueta || s.tipo,
        acordesTexto: (s.acordes || [])
          .map((a: any) => chordToLabel({ raiz: a.raiz, calidad: a.calidad || '', bajo: a.bajo || null }))
          .join(' '),
        letra: s.letra || '',
        confianza: s.confianza,
      }));
      setSecciones(nuevasSecciones);
      if (data.notas) setNotaIA(data.notas);
    } catch (e: any) {
      if (e.name === 'AbortError') {
        setError('Se tardó demasiado y el servidor la cortó a la mitad. Prueba de nuevo — a veces la segunda vez es más rápida.');
      } else {
        setError('No se pudo contactar al servidor. Revisa tu conexión e intenta de nuevo.');
      }
    } finally {
      setBuscandoIA(false);
    }
  }

  function agregarSeccion() {
    setSecciones((s) => [...s, { _key: generarKey(), tipo: 'verso', etiqueta: 'Verso', acordesTexto: '', letra: '' }]);
  }
  function insertarSeccionEn(posicion: number) {
    setSecciones((s) => {
      const copia = [...s];
      copia.splice(posicion, 0, { _key: generarKey(), tipo: 'verso', etiqueta: 'Verso', acordesTexto: '', letra: '' });
      return copia;
    });
  }
  function quitarSeccion(key: string) {
    setSecciones((s) => s.filter((sec) => sec._key !== key));
  }
  function actualizarSeccion(key: string, campo: keyof SeccionInput, valor: string) {
    setSecciones((s) => s.map((sec) => (sec._key === key ? { ...sec, [campo]: valor } : sec)));
  }
  function transportarFormulario(delta: number) {
    setTono((t) => (t.trim() ? chordToLabel(transposeChord(parseChordToken(t.trim()), delta)) : t));
    setSecciones((s) =>
      s.map((sec) => ({
        ...sec,
        acordesTexto: acordesToLinea(parseAcordesLinea(sec.acordesTexto).map((a) => transposeChord(a, delta))),
      }))
    );
  }

  function onSeccionDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setSecciones((prev) => {
      const oldIndex = prev.findIndex((s) => s._key === active.id);
      const newIndex = prev.findIndex((s) => s._key === over.id);
      return arrayMove(prev, oldIndex, newIndex);
    });
  }

  async function guardar() {
    if (!titulo.trim()) {
      setError('Ponle un título a la canción.');
      return;
    }
    setGuardando(true);
    setError(null);
    try {
      if (modoEdicion && versionIdToEdit) {
        await updateCancionVersion(versionIdToEdit, {
          titulo: titulo.trim(),
          artista: artista.trim(),
          etiquetaVersion: etiquetaVersion.trim(),
          tono: tono.trim(),
          secciones,
        });
        volverAqui();
      } else {
        await createCancionVersion({
          titulo: titulo.trim(),
          artista: artista.trim(),
          etiquetaVersion: etiquetaVersion.trim(),
          tono: tono.trim(),
          secciones,
          agregarASetlistId: setlistId,
        });
        router.push(setlistId ? `/setlists/${setlistId}/edit` : '/');
      }
    } catch (e: any) {
      setError(e.message || 'No se pudo guardar la canción');
      setGuardando(false);
    }
  }

  if (cargando) return <div className="p-6 text-center text-muted">Cargando canción…</div>;

  return (
    <main className="max-w-md mx-auto p-4 pb-10">
      <div className="flex items-center gap-2 mb-4">
        <button className="text-lg" onClick={volverAqui}>
          ←
        </button>
        <h1 className="text-lg font-semibold">{modoEdicion ? 'Editar canción' : 'Nueva canción'}</h1>
      </div>

      <label className="block text-xs text-muted mb-1">Título</label>
      <input
        value={titulo}
        onChange={(e) => setTitulo(e.target.value)}
        className="w-full mb-3 px-3 py-2 rounded-lg border border-border bg-card"
      />

      <div className="flex gap-2 mb-3">
        <div className="flex-1">
          <label className="block text-xs text-muted mb-1">Artista</label>
          <input
            value={artista}
            onChange={(e) => setArtista(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-border bg-card"
          />
        </div>
        <div className="flex-1">
          <label className="block text-xs text-muted mb-1">Versión</label>
          <input
            value={etiquetaVersion}
            onChange={(e) => setEtiquetaVersion(e.target.value)}
            placeholder="Estudio"
            className="w-full px-3 py-2 rounded-lg border border-border bg-card"
          />
        </div>
      </div>

      <label className="block text-xs text-muted mb-1">Tono</label>
      <div className="flex items-center gap-2 mb-4">
        <input
          value={tono}
          onChange={(e) => setTono(e.target.value)}
          placeholder="G"
          className="w-28 px-3 py-2 rounded-lg border border-border bg-card"
        />
        <button
          className="w-8 h-8 rounded-full border border-border text-sm"
          onClick={() => transportarFormulario(-1)}
          title="Transportar toda la canción un semitono abajo"
        >
          −
        </button>
        <button
          className="w-8 h-8 rounded-full border border-border text-sm"
          onClick={() => transportarFormulario(1)}
          title="Transportar toda la canción un semitono arriba"
        >
          +
        </button>
        <span className="text-xs text-muted">transportar todo</span>
      </div>

      <label className="block text-xs text-muted mb-1">Link de referencia (opcional)</label>
      <input
        value={urlReferencia}
        onChange={(e) => setUrlReferencia(e.target.value)}
        placeholder="https://... una página con los acordes"
        className="w-full mb-2 px-3 py-2 rounded-lg border border-border bg-card text-sm"
      />
      <p className="text-xs text-muted mb-3">
        Si pegas un link, la IA lo usa directo (más rápido) en vez de buscar en internet. Trae acordes y letra como borrador — revísalos antes de guardar.
      </p>

      <button
        disabled={buscandoIA}
        onClick={buscarConIA}
        className="w-full mb-2 py-2.5 rounded-xl bg-accent text-white text-sm disabled:opacity-90 flex items-center justify-center gap-2"
      >
        {buscandoIA && (
          <span className="flex gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-bounce" style={{ animationDelay: '300ms' }} />
          </span>
        )}
        {buscandoIA ? 'Buscando y generando acordes…' : '✨ Buscar con IA'}
      </button>
      <p className="text-xs text-muted mb-4">
        {buscandoIA
          ? 'Puede tardar hasta 90 segundos si busca en internet — con un link de referencia es mucho más rápido.'
          : modoEdicion
            ? 'Vuelve a generar el borrador si quieres reemplazar las secciones actuales.'
            : 'Genera un borrador de acordes por sección. Revísalo abajo antes de guardar.'}
      </p>

      {notaIA && <div className="text-sm bg-chip rounded-lg p-3 mb-4 text-muted">{notaIA}</div>}

      <h2 className="text-sm font-medium mb-2">Secciones</h2>
      <p className="text-xs text-muted mb-2">
        Toca el "+" para insertar una sección justo ahí, o arrastra el ⠿ para reordenar.
      </p>

      <DndContext sensors={seccionSensors} collisionDetection={closestCenter} onDragEnd={onSeccionDragEnd}>
        <SortableContext items={secciones.map((s) => s._key)} strategy={verticalListSortingStrategy}>
          <div className="flex flex-col mb-3">
            <InsertarAqui onClick={() => insertarSeccionEn(0)} />
            {secciones.map((s, i) => (
              <div key={s._key}>
                <SortableSeccionCard
                  seccion={s}
                  onCampo={(campo, valor) => actualizarSeccion(s._key, campo, valor)}
                  onQuitar={() => quitarSeccion(s._key)}
                />
                <InsertarAqui onClick={() => insertarSeccionEn(i + 1)} />
              </div>
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <button
        className="w-full mb-5 py-2 rounded-xl border border-dashed border-border text-sm"
        onClick={agregarSeccion}
      >
        + Agregar sección al final
      </button>

      {error && <div className="text-sm text-red-600 mb-3 whitespace-pre-wrap break-words">{error}</div>}

      <button
        disabled={guardando}
        onClick={guardar}
        className="w-full py-2.5 rounded-xl bg-accent text-white text-sm disabled:opacity-60"
      >
        {guardando ? 'Guardando…' : modoEdicion ? 'Guardar cambios' : 'Guardar canción'}
      </button>
    </main>
  );
}
