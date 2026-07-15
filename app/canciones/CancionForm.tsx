'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  createCancionVersion,
  updateCancionVersion,
  getVersionCompleta,
  SeccionInput,
} from '@/lib/queries';
import { chordToLabel } from '@/lib/chords';

const TIPOS = ['intro', 'verso', 'precoro', 'coro', 'puente', 'solo', 'outro', 'otro'];

type SeccionEditable = SeccionInput & { confianza?: 'alta' | 'media' | 'baja' };

export default function CancionForm({
  versionIdToEdit,
  setlistId,
}: {
  versionIdToEdit?: string;
  setlistId?: string;
}) {
  const router = useRouter();
  const modoEdicion = Boolean(versionIdToEdit);

  const [cargando, setCargando] = useState(modoEdicion);
  const [titulo, setTitulo] = useState('');
  const [artista, setArtista] = useState('');
  const [etiquetaVersion, setEtiquetaVersion] = useState('Estudio');
  const [tono, setTono] = useState('');
  const [secciones, setSecciones] = useState<SeccionEditable[]>([]);
  const [guardando, setGuardando] = useState(false);
  const [buscandoIA, setBuscandoIA] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notaIA, setNotaIA] = useState<string | null>(null);

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
          tipo: s.tipo,
          etiqueta: s.etiqueta,
          acordesTexto: s.acordes.map((a) => chordToLabel(a)).join(' '),
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
      const timeoutId = setTimeout(() => controller.abort(), 55000);
      const res = await fetch('/api/generar-acordes', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ titulo, artista, version: etiquetaVersion }),
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
        tipo: TIPOS.includes(s.tipo) ? s.tipo : 'otro',
        etiqueta: s.etiqueta || s.tipo,
        acordesTexto: (s.acordes || [])
          .map((a: any) => chordToLabel({ raiz: a.raiz, calidad: a.calidad || '', bajo: a.bajo || null }))
          .join(' '),
        letra: '',
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
    setSecciones((s) => [...s, { tipo: 'verso', etiqueta: 'Verso', acordesTexto: '', letra: '' }]);
  }
  function quitarSeccion(i: number) {
    setSecciones((s) => s.filter((_, idx) => idx !== i));
  }
  function actualizarSeccion(i: number, campo: keyof SeccionInput, valor: string) {
    setSecciones((s) => s.map((sec, idx) => (idx === i ? { ...sec, [campo]: valor } : sec)));
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
        router.push('/canciones');
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
        <button
          className="text-lg"
          onClick={() =>
            router.push(modoEdicion ? '/canciones' : setlistId ? `/setlists/${setlistId}/agregar` : '/')
          }
        >
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
      <input
        value={tono}
        onChange={(e) => setTono(e.target.value)}
        placeholder="G"
        className="w-28 mb-4 px-3 py-2 rounded-lg border border-border bg-card"
      />

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
          ? 'Puede tardar hasta 40 segundos — está buscando en internet y armando los acordes.'
          : modoEdicion
            ? 'Vuelve a generar el borrador si quieres reemplazar las secciones actuales.'
            : 'Genera un borrador de acordes por sección. Revísalo abajo antes de guardar.'}
      </p>

      {notaIA && <div className="text-sm bg-chip rounded-lg p-3 mb-4 text-muted">{notaIA}</div>}

      <h2 className="text-sm font-medium mb-2">Secciones</h2>
      <div className="flex flex-col gap-3 mb-3">
        {secciones.map((s, i) => (
          <div
            key={i}
            className="border rounded-2xl p-3 bg-card"
            style={{ borderColor: s.confianza === 'baja' ? '#c17a3a' : 'var(--border)' }}
          >
            <div className="flex items-center gap-2 mb-2">
              <select
                value={s.tipo}
                onChange={(e) => actualizarSeccion(i, 'tipo', e.target.value)}
                className="px-2 py-1 rounded-lg border border-border bg-bg text-sm"
              >
                {TIPOS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              {s.confianza === 'baja' && (
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-chip text-muted">revisar acordes</span>
              )}
              <button className="ml-auto text-red-600 text-sm" onClick={() => quitarSeccion(i)}>
                ×
              </button>
            </div>
            <label className="block text-xs text-muted mb-1">Etiqueta</label>
            <input
              value={s.etiqueta}
              onChange={(e) => actualizarSeccion(i, 'etiqueta', e.target.value)}
              className="w-full mb-2 px-3 py-2 rounded-lg border border-border bg-bg text-sm"
            />
            <label className="block text-xs text-muted mb-1">
              Acordes (separados por espacio, ej. G Em Cadd9 D)
            </label>
            <input
              value={s.acordesTexto}
              onChange={(e) => actualizarSeccion(i, 'acordesTexto', e.target.value)}
              className="w-full mb-2 px-3 py-2 rounded-lg border border-border bg-bg text-sm"
            />
            <label className="block text-xs text-muted mb-1">Letra (opcional, modo vocalista)</label>
            <textarea
              value={s.letra}
              onChange={(e) => actualizarSeccion(i, 'letra', e.target.value)}
              rows={2}
              className="w-full px-3 py-2 rounded-lg border border-border bg-bg text-sm"
            />
          </div>
        ))}
      </div>

      <button
        className="w-full mb-5 py-2 rounded-xl border border-dashed border-border text-sm"
        onClick={agregarSeccion}
      >
        + Agregar sección
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
