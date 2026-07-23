'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check } from 'lucide-react';
import { getBandas, createBanda } from '@/lib/queries';
import { Banda } from '@/lib/types';
import { getBandaActualId, setBandaActualId } from '@/lib/bandaActual';

export default function BandasPage() {
  const router = useRouter();
  const [bandas, setBandas] = useState<Banda[]>([]);
  const [actualId, setActualId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [nombreNueva, setNombreNueva] = useState('');
  const [creando, setCreando] = useState(false);

  useEffect(() => {
    setActualId(getBandaActualId());
    getBandas().then((b) => {
      setBandas(b);
      setLoading(false);
    });
  }, []);

  function seleccionar(id: string) {
    setBandaActualId(id);
    router.push('/');
  }

  async function crear() {
    if (!nombreNueva.trim()) return;
    setCreando(true);
    try {
      const nueva = await createBanda(nombreNueva.trim());
      setBandas((b) => [...b, nueva]);
      setNombreNueva('');
      seleccionar(nueva.id);
    } finally {
      setCreando(false);
    }
  }

  return (
    <main className="max-w-md mx-auto p-4">
      <h1 className="text-xl font-semibold mb-1">Proyecto Musical</h1>
      <p className="text-sm text-muted mb-4">Elige con qué agrupación quieres trabajar.</p>

      {loading && <div className="text-center text-muted py-6">Cargando…</div>}

      <div className="flex flex-col gap-2 mb-5">
        {bandas.map((b) => (
          <button
            key={b.id}
            onClick={() => seleccionar(b.id)}
            className="flex items-center justify-between p-4 rounded-2xl border border-border bg-card text-left"
          >
            <span className="font-medium">{b.nombre}</span>
            {actualId === b.id && <Check size={18} className="text-accent flex-shrink-0" />}
          </button>
        ))}
        {!loading && bandas.length === 0 && (
          <div className="text-sm text-muted text-center py-6">
            Todavía no tienes ninguna agrupación. Crea la primera abajo.
          </div>
        )}
      </div>

      <div className="border-t border-border pt-4">
        <label className="block text-xs text-muted mb-1">Nueva agrupación</label>
        <input
          value={nombreNueva}
          onChange={(e) => setNombreNueva(e.target.value)}
          placeholder="Nombre de la banda o proyecto"
          className="w-full mb-2 px-3 py-2 rounded-lg border border-border bg-card"
        />
        <button
          disabled={creando || !nombreNueva.trim()}
          onClick={crear}
          className="w-full py-2.5 rounded-xl bg-accent text-white text-sm disabled:opacity-60"
        >
          {creando ? 'Creando…' : '+ Crear agrupación'}
        </button>
      </div>
    </main>
  );
}
