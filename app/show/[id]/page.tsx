'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Setlist, Version } from '@/lib/types';
import { chordToLabel, parseChordToken, transposeChord } from '@/lib/chords';

export default function ModoShowPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [setlist, setSetlist] = useState<Setlist | null>(null);
  const [versions, setVersions] = useState<Version[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [index, setIndex] = useState(0);
  const [semitones, setSemitones] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [modoVocalista, setModoVocalista] = useState(false);
  const [dark, setDark] = useState(false);

  const touchStartX = useRef<number | null>(null);
  const peekTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Carga inicial: setlist + sus versiones (una sola vez; en modo show no se
  // vuelve a llamar a Supabase, todo vive ya en memoria/estado de React)
  useEffect(() => {
    async function load() {
      try {
        const { data: sl, error: e1 } = await supabase
          .from('setlists')
          .select('id, id_corto, nombre, banda_id, fecha, lugar')
          .eq('id', id)
          .single();
        if (e1 || !sl) throw e1 || new Error('Setlist no encontrado');

        const { data: rows, error: e2 } = await supabase
          .from('setlist_canciones')
          .select(
            `orden,
             versiones (
               id, cancion_id, etiqueta_version, tono_original, capo,
               canciones ( titulo, artista ),
               secciones ( id, tipo, etiqueta, orden, acordes, letra )
             )`
          )
          .eq('setlist_id', id)
          .order('orden', { ascending: true });
        if (e2) throw e2;

        const parsed: Version[] = (rows || []).map((r: any) => ({
          ...r.versiones,
          secciones: [...r.versiones.secciones].sort((a: any, b: any) => a.orden - b.orden),
        }));

        setSetlist(sl as Setlist);
        setVersions(parsed);
      } catch (err: any) {
        setError(err.message || 'No se pudo cargar el setlist');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  useEffect(() => {
    if (document.documentElement.classList.contains('dark')) setDark(true);
  }, []);

  function peekDrawer() {
    setDrawerOpen(true);
    if (peekTimer.current) clearTimeout(peekTimer.current);
    peekTimer.current = setTimeout(() => setDrawerOpen(false), 2500);
  }

  useEffect(() => {
    if (versions.length > 0) peekDrawer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [versions.length]);

  function cambiarCancion(dir: 1 | -1) {
    const next = index + dir;
    if (next < 0 || next >= versions.length) return;
    setIndex(next);
    setSemitones(0);
    peekDrawer();
  }

  function toggleTema() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle('dark', next);
  }

  function onTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
  }
  function onTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(dx) > 50) cambiarCancion(dx < 0 ? 1 : -1);
    touchStartX.current = null;
  }

  if (loading) return <div className="p-6 text-center text-muted">Cargando setlist…</div>;
  if (error || !setlist) return <div className="p-6 text-center text-muted">{error || 'No encontrado'}</div>;
  if (versions.length === 0)
    return (
      <div className="p-6 text-center text-muted">
        Este setlist no tiene canciones todavía.
        <br />
        <button className="mt-4 underline" onClick={() => router.push('/')}>
          Volver
        </button>
      </div>
    );

  const version = versions[index];
  const prevVersion = index > 0 ? versions[index - 1] : null;
  const nextVersion = index < versions.length - 1 ? versions[index + 1] : null;
  const tonoBase = version.tono_original ? parseChordToken(version.tono_original) : null;
  const tonoActual = tonoBase ? chordToLabel(transposeChord(tonoBase, semitones)) : '—';

  return (
    <div
      className="max-w-md mx-auto flex flex-col p-5 select-none"
      style={{ height: '100dvh' }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Cajón deslizable (fijo, no scrollea) */}
      <div className="flex-shrink-0">
        <button
          className="flex justify-center w-full mb-1"
          aria-label="Mostrar u ocultar setlist y tono"
          onClick={() => setDrawerOpen((o) => !o)}
        >
          <span className="w-9 h-1 rounded-full bg-border block" />
        </button>
        <div
          className="overflow-hidden text-xs text-muted transition-all"
          style={{ maxHeight: drawerOpen ? 80 : 0 }}
        >
          <div className="py-1">
            {setlist.nombre} · {index + 1}/{versions.length}
          </div>
          <div className="flex items-center gap-2 pb-2">
            <button
              className="w-7 h-7 rounded-full border border-border"
              onClick={() => setSemitones((s) => s - 1)}
            >
              −
            </button>
            <span>
              Tono: {tonoActual}
              {semitones !== 0 ? ` (${semitones > 0 ? '+' : ''}${semitones})` : ''}
            </span>
            <button
              className="w-7 h-7 rounded-full border border-border"
              onClick={() => setSemitones((s) => s + 1)}
            >
              +
            </button>
            <span className="ml-auto font-medium text-text">Setlist {setlist.id_corto}</span>
          </div>
        </div>

        {/* Encabezado de la canción */}
        <div className="flex items-baseline gap-2 flex-wrap pb-3 mb-3 border-b border-border">
          <span className="text-xl font-semibold">{version.canciones.titulo}</span>
          <span className="text-sm text-muted">{version.canciones.artista}</span>
          <span className="text-xs text-muted opacity-75">· {version.etiqueta_version}</span>
          <div className="ml-auto flex gap-2">
            <button
              className="w-8 h-8 rounded-full border border-border text-xs"
              onClick={() => router.push(`/canciones/${version.id}/editar`)}
              title="Editar acordes (para ensayos)"
            >
              ✏️
            </button>
            <button
              className="w-8 h-8 rounded-full border border-border text-xs"
              onClick={() => setModoVocalista((m) => !m)}
              title="Modo músico / vocalista"
            >
              {modoVocalista ? 'V' : 'M'}
            </button>
            <button className="w-8 h-8 rounded-full border border-border text-xs" onClick={toggleTema}>
              ◐
            </button>
          </div>
        </div>
      </div>

      {/* Secciones: esta es la única parte que scrollea */}
      <div className="flex-1 overflow-y-auto flex flex-col gap-4 min-h-0">
        {version.secciones.map((s) => (
          <div key={s.id}>
            <div className="text-[11px] tracking-wide uppercase text-muted mb-2">{s.etiqueta}</div>
            {modoVocalista ? (
              <div className="text-[15px] leading-relaxed whitespace-pre-wrap">
                {s.letra || <span className="text-muted">Sin letra capturada</span>}
              </div>
            ) : (
              <div className="flex gap-2 flex-wrap">
                {s.acordes.map((a, i) => (
                  <span key={i} className="text-[22px] font-semibold px-3 py-1 rounded-lg bg-chip">
                    {chordToLabel(transposeChord(a, semitones))}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Navegación (fija, no scrollea) */}
      <div className="flex-shrink-0">
        <div className="flex justify-center gap-1 pt-3">
          {versions.map((_, i) => (
            <span
              key={i}
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: i === index ? 'currentColor' : 'var(--border)' }}
            />
          ))}
        </div>
        <div className="flex justify-between items-center pt-2 text-xs text-muted">
          <button onClick={() => cambiarCancion(-1)} disabled={!prevVersion}>
            ← {prevVersion?.canciones.titulo || ''}
          </button>
          <button onClick={() => cambiarCancion(1)} disabled={!nextVersion}>
            {nextVersion?.canciones.titulo || ''} →
          </button>
        </div>
      </div>
    </div>
  );
}
