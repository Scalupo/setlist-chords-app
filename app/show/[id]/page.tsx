'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Pencil, Guitar, Mic2, SunMoon, ChevronDown, ChevronUp, List, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Setlist, Version } from '@/lib/types';
import { chordToLabel, parseChordToken, transposeChord } from '@/lib/chords';
import { guardarTransposicion } from '@/lib/queries';

export default function ModoShowPage() {
  return (
    <Suspense fallback={<div className="p-6 text-center text-muted">Cargando…</div>}>
      <ModoShowInner />
    </Suspense>
  );
}

function ModoShowInner() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const resumeVersionId = searchParams.get('resume');

  const [setlist, setSetlist] = useState<Setlist | null>(null);
  const [versions, setVersions] = useState<Version[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [index, setIndex] = useState(0);
  const [semitones, setSemitones] = useState(0);
  const [navDrawerOpen, setNavDrawerOpen] = useState(false);
  const [tonoDrawerOpen, setTonoDrawerOpen] = useState(false);
  const [modoVocalista, setModoVocalista] = useState(false);
  const [dark, setDark] = useState(false);
  const [guardandoTono, setGuardandoTono] = useState(false);
  const [tonoGuardadoMsg, setTonoGuardadoMsg] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

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

        // Si venimos de editar una canción específica, reanudamos justo ahí
        // en vez de reiniciar en la primera del setlist.
        if (resumeVersionId) {
          const idx = parsed.findIndex((v) => v.id === resumeVersionId);
          if (idx >= 0) setIndex(idx);
        }
      } catch (err: any) {
        setError(err.message || 'No se pudo cargar el setlist');
      } finally {
        setLoading(false);
      }
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (document.documentElement.classList.contains('dark')) setDark(true);
  }, []);

  // Al cambiar de canción, mostramos brevemente ambos paneles (navegación y
  // tono) para confirmar de un vistazo dónde estás, y luego se cierran solos.
  function peekDrawers() {
    setNavDrawerOpen(true);
    setTonoDrawerOpen(true);
    if (peekTimer.current) clearTimeout(peekTimer.current);
    peekTimer.current = setTimeout(() => {
      setNavDrawerOpen(false);
      setTonoDrawerOpen(false);
    }, 2500);
  }

  useEffect(() => {
    if (versions.length > 0) peekDrawers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [versions.length]);

  function cambiarCancion(dir: 1 | -1) {
    const next = index + dir;
    if (next < 0 || next >= versions.length) return;
    setIndex(next);
    setSemitones(0);
    peekDrawers();
  }

  function irACancion(i: number) {
    setIndex(i);
    setSemitones(0);
    setPickerOpen(false);
    peekDrawers();
  }

  function toggleTema() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle('dark', next);
  }

  async function guardarTonoActual() {
    if (semitones === 0) return;
    setGuardandoTono(true);
    try {
      const v = versions[index];
      const { nuevoTono } = await guardarTransposicion(v.id, semitones, v.tono_original);
      setVersions((prev) =>
        prev.map((ver, i) =>
          i === index
            ? {
                ...ver,
                tono_original: nuevoTono,
                secciones: ver.secciones.map((s) => ({
                  ...s,
                  acordes: s.acordes.map((a) => transposeChord(a, semitones)),
                })),
              }
            : ver
        )
      );
      setSemitones(0);
      setTonoGuardadoMsg(true);
      setTimeout(() => setTonoGuardadoMsg(false), 2000);
    } catch {
      alert('No se pudo guardar el tono. Intenta de nuevo.');
    } finally {
      setGuardandoTono(false);
    }
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
      <div className="flex-shrink-0">
        {/* Manija: abre/cierra el panel de navegación (Setlists / ID / Canciones) */}
        <button
          className="flex justify-center w-full mb-1"
          aria-label="Mostrar u ocultar navegación"
          onClick={() => setNavDrawerOpen((o) => !o)}
        >
          <span className="w-9 h-1 rounded-full bg-border block" />
        </button>
        <div
          className="overflow-hidden transition-all"
          style={{ maxHeight: navDrawerOpen ? 60 : 0 }}
        >
          <div className="flex items-center gap-2 pb-3">
            <Link
              href="/"
              className="flex-1 text-center py-2 rounded-xl border border-border text-xs font-medium"
            >
              Setlists
            </Link>
            <span className="text-xs font-semibold px-3 py-2 rounded-xl bg-chip text-muted whitespace-nowrap">
              {setlist.id_corto}
            </span>
            <Link
              href="/canciones"
              className="flex-1 text-center py-2 rounded-xl border border-border text-xs font-medium"
            >
              Canciones
            </Link>
          </div>
        </div>

        {/* Encabezado de la canción: tocarlo abre/cierra el panel de tono */}
        <div className="flex items-center gap-2 pb-1">
          <button
            className="flex items-baseline gap-2 flex-wrap text-left flex-1 min-w-0"
            onClick={() => setTonoDrawerOpen((o) => !o)}
            aria-label="Mostrar u ocultar tono"
          >
            <span className="text-xl font-semibold truncate">{version.canciones.titulo}</span>
            <span className="text-sm text-muted truncate">{version.canciones.artista}</span>
            <span className="text-xs text-muted opacity-75 flex-shrink-0">· {version.etiqueta_version}</span>
            <span className="text-muted flex-shrink-0">
              {tonoDrawerOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </span>
          </button>
          <div className="flex gap-2 flex-shrink-0">
            <button
              className="w-11 h-11 rounded-2xl border border-border flex items-center justify-center"
              onClick={() => router.push(`/canciones/${version.id}/editar?setlistId=${id}&origen=show`)}
              title="Editar acordes (para ensayos)"
            >
              <Pencil size={20} />
            </button>
            <button
              className="w-11 h-11 rounded-2xl border border-border flex items-center justify-center"
              onClick={() => setModoVocalista((m) => !m)}
              title="Modo músico / vocalista"
            >
              {modoVocalista ? <Guitar size={20} /> : <Mic2 size={20} />}
            </button>
            <button
              className="w-11 h-11 rounded-2xl border border-border flex items-center justify-center"
              onClick={toggleTema}
              title="Tema claro / oscuro"
            >
              <SunMoon size={20} />
            </button>
          </div>
        </div>

        <div
          className="overflow-hidden text-xs text-muted transition-all"
          style={{ maxHeight: tonoDrawerOpen ? 48 : 0 }}
        >
          <div className="flex items-center gap-2 pb-2 flex-wrap">
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
            {semitones !== 0 && (
              <button
                disabled={guardandoTono}
                onClick={guardarTonoActual}
                className="text-[11px] px-2 py-1 rounded-full bg-accent text-white disabled:opacity-60"
              >
                {guardandoTono ? 'Guardando…' : 'Guardar este tono'}
              </button>
            )}
            {tonoGuardadoMsg && <span className="text-[11px] text-muted">✓ Guardado</span>}
          </div>
        </div>

        <div className="border-b border-border mb-3" />
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
                  <span
                    key={i}
                    className="text-[22px] font-semibold px-3 py-1 rounded-lg bg-chip text-center"
                    style={{ minWidth: `${20 + (Math.min(a.duracion || 1, 5) - 1) * 22}px` }}
                  >
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
        <div className="flex items-center gap-2 pt-2 text-xs text-muted">
          <button className="flex-1 text-left truncate" onClick={() => cambiarCancion(-1)} disabled={!prevVersion}>
            ← {prevVersion?.canciones.titulo || ''}
          </button>
          <button
            className="w-10 h-10 rounded-2xl border border-border flex items-center justify-center flex-shrink-0 text-text"
            onClick={() => setPickerOpen(true)}
            aria-label="Ver todas las canciones del setlist"
          >
            <List size={18} />
          </button>
          <button className="flex-1 text-right truncate" onClick={() => cambiarCancion(1)} disabled={!nextVersion}>
            {nextVersion?.canciones.titulo || ''} →
          </button>
        </div>
      </div>

      {pickerOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center"
          style={{ background: 'rgba(0,0,0,0.45)' }}
          onClick={() => setPickerOpen(false)}
        >
          <div
            className="w-full max-w-md bg-card rounded-t-3xl p-4 flex flex-col"
            style={{ maxHeight: '70vh' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3 flex-shrink-0">
              <span className="text-sm font-medium">Canciones del setlist</span>
              <button
                className="w-9 h-9 rounded-2xl border border-border flex items-center justify-center"
                onClick={() => setPickerOpen(false)}
                aria-label="Cerrar"
              >
                <X size={18} />
              </button>
            </div>
            <div className="overflow-y-auto flex flex-col gap-1">
              {versions.map((v, i) => (
                <button
                  key={v.id}
                  onClick={() => irACancion(i)}
                  className="flex items-center gap-3 p-2.5 rounded-xl text-left"
                  style={{ background: i === index ? 'var(--chip)' : 'transparent' }}
                >
                  <span className="text-xs text-muted w-5 flex-shrink-0">{i + 1}.</span>
                  <span className="flex-1 min-w-0">
                    <span className="text-sm font-medium block truncate">{v.canciones.titulo}</span>
                    <span className="text-xs text-muted block truncate">
                      {v.canciones.artista} · {v.etiqueta_version}
                    </span>
                  </span>
                  {i === index && <span className="text-accent flex-shrink-0">●</span>}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
