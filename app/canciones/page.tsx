'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil } from 'lucide-react';
import { getAllVersions, VersionBusqueda } from '@/lib/queries';
import { getBandaActualId } from '@/lib/bandaActual';

export default function CancionesPage() {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [items, setItems] = useState<VersionBusqueda[]>([]);
  const [cargando, setCargando] = useState(true);
  const [bandaId, setBandaId] = useState<string | null>(null);

  useEffect(() => {
    const id = getBandaActualId();
    if (!id) {
      router.push('/bandas');
      return;
    }
    setBandaId(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!bandaId) return;
    let vivo = true;
    setCargando(true);
    getAllVersions(q, bandaId).then((r) => {
      if (vivo) {
        setItems(r);
        setCargando(false);
      }
    });
    return () => {
      vivo = false;
    };
  }, [q, bandaId]);

  return (
    <main className="max-w-md mx-auto p-4">
      <div className="flex items-center gap-2 mb-4">
        <button className="text-lg" onClick={() => router.push('/')}>
          ←
        </button>
        <h1 className="text-lg font-semibold">Tus canciones</h1>
      </div>

      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Buscar canción o artista"
        className="w-full mb-3 px-3 py-2 rounded-lg border border-border bg-card"
      />

      <div className="border border-border rounded-2xl bg-card divide-y divide-border mb-4">
        {cargando && <div className="p-4 text-sm text-muted text-center">Cargando…</div>}
        {!cargando && items.length === 0 && (
          <div className="p-4 text-sm text-muted text-center">
            {q ? 'Sin resultados.' : 'Todavía no has guardado ninguna canción.'}
          </div>
        )}
        {items.map((v) => (
          <button
            key={v.id}
            className="w-full flex items-center gap-2 p-3 text-left"
            onClick={() => router.push(`/canciones/${v.id}/editar`)}
          >
            <span className="flex-1">
              <strong className="text-sm">{v.titulo}</strong>
              <br />
              <span className="text-xs text-muted">
                {v.artista} · {v.etiqueta_version}
              </span>
            </span>
            <span className="text-muted"><Pencil size={16} /></span>
          </button>
        ))}
      </div>

      <button
        className="w-full py-2.5 rounded-xl border border-dashed border-border text-sm"
        onClick={() => router.push('/canciones/nueva')}
      >
        + Nueva canción
      </button>
    </main>
  );
}
