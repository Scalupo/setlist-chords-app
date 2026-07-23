'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getSetlists, getBandas } from '@/lib/queries';
import { Setlist, Banda } from '@/lib/types';
import { getBandaActualId, setBandaActualId } from '@/lib/bandaActual';

export default function HomePage() {
  const router = useRouter();
  const [banda, setBanda] = useState<Banda | null>(null);
  const [setlists, setSetlists] = useState<Setlist[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const bandas = await getBandas();

      if (bandas.length === 0) {
        // Primera vez que se usa la app: no hay ninguna banda todavía.
        router.push('/bandas');
        return;
      }

      let actualId = getBandaActualId();
      const actualExiste = bandas.some((b) => b.id === actualId);
      if (!actualId || !actualExiste) {
        if (bandas.length === 1) {
          // Solo hay una banda -- la seleccionamos sola, sin pedirle nada al usuario.
          actualId = bandas[0].id;
          setBandaActualId(actualId);
        } else {
          router.push('/bandas');
          return;
        }
      }

      const bandaActual = bandas.find((b) => b.id === actualId) || null;
      setBanda(bandaActual);
      const sl = await getSetlists(actualId!);
      setSetlists(sl);
      setLoading(false);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) return <div className="p-6 text-center text-muted">Cargando…</div>;

  return (
    <main className="max-w-md mx-auto p-4">
      <div className="flex justify-between items-center mb-1">
        <h1 className="text-xl font-semibold">Tus setlists</h1>
        <Link href="/canciones" className="text-sm text-accent underline">
          Tus canciones
        </Link>
      </div>

      {banda && (
        <Link href="/bandas" className="inline-block text-xs text-muted underline mb-4">
          {banda.nombre} · cambiar
        </Link>
      )}

      {setlists.length === 0 && (
        <div className="text-center text-muted py-10 text-sm">Todavía no tienes setlists.</div>
      )}

      <div className="flex flex-col gap-3 mb-4">
        {setlists.map((sl) => (
          <div key={sl.id} className="border border-border rounded-2xl p-4 bg-card">
            <div className="flex justify-between items-center mb-2">
              <strong>{sl.nombre}</strong>
              <span className="text-xs px-2 py-0.5 rounded-full bg-chip text-muted">{sl.id_corto}</span>
            </div>
            <div className="flex gap-2">
              <Link
                href={`/setlists/${sl.id}/edit`}
                className="flex-1 text-center py-2 rounded-xl border border-border text-sm"
              >
                Editar
              </Link>
              <Link
                href={`/show/${sl.id}`}
                className="flex-1 text-center py-2 rounded-xl bg-accent text-white text-sm"
              >
                Modo show
              </Link>
            </div>
          </div>
        ))}
      </div>

      <Link
        href="/setlists/new"
        className="block text-center w-full py-2.5 rounded-xl bg-accent text-white text-sm"
      >
        + Nuevo setlist
      </Link>
    </main>
  );
}
