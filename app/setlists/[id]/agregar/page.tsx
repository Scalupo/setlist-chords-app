'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { addVersionToSetlist, searchVersions, VersionBusqueda } from '@/lib/queries';

export default function AgregarCancionPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [q, setQ] = useState('');
  const [resultados, setResultados] = useState<VersionBusqueda[]>([]);
  const [agregando, setAgregando] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    searchVersions(q).then((r) => {
      if (vivo) setResultados(r);
    });
    return () => {
      vivo = false;
    };
  }, [q]);

  async function agregar(versionId: string) {
    setAgregando(versionId);
    await addVersionToSetlist(id, versionId);
    router.push(`/setlists/${id}/edit`);
  }

  return (
    <main className="max-w-md mx-auto p-4">
      <div className="flex items-center gap-2 mb-4">
        <button className="text-lg" onClick={() => router.push(`/setlists/${id}/edit`)}>
          ←
        </button>
        <h1 className="text-lg font-semibold">Agregar canción</h1>
      </div>

      <input
        autoFocus
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Buscar canción o artista"
        className="w-full mb-3 px-3 py-2 rounded-lg border border-border bg-card"
      />

      <button
        className="w-full mb-4 py-2.5 rounded-xl border border-dashed border-border text-sm"
        onClick={() => router.push(`/canciones/nueva?setlistId=${id}`)}
      >
        + Crear nueva canción
      </button>

      <div className="border border-border rounded-2xl bg-card divide-y divide-border mb-4">
        {resultados.length === 0 && (
          <div className="p-4 text-sm text-muted text-center">Sin resultados.</div>
        )}
        {resultados.map((r) => (
          <div key={r.id} className="flex items-center gap-2 p-3">
            <div className="flex-1">
              <strong className="text-sm">{r.titulo}</strong>
              <br />
              <span className="text-xs text-muted">
                {r.artista} · {r.etiqueta_version}
              </span>
            </div>
            <button
              disabled={agregando === r.id}
              className="w-8 h-8 rounded-full bg-accent text-white text-sm disabled:opacity-60"
              onClick={() => agregar(r.id)}
            >
              +
            </button>
          </div>
        ))}
      </div>
    </main>
  );
}
