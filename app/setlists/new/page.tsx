'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createSetlist } from '@/lib/queries';
import { getBandaActualId } from '@/lib/bandaActual';

export default function NuevoSetlistPage() {
  const router = useRouter();
  const [nombre, setNombre] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function crear() {
    if (!nombre.trim()) {
      setError('Ponle un nombre al show antes de continuar.');
      return;
    }
    const bandaId = getBandaActualId();
    if (!bandaId) {
      router.push('/bandas');
      return;
    }
    setGuardando(true);
    setError(null);
    try {
      const id = await createSetlist(nombre.trim(), bandaId);
      router.push(`/setlists/${id}/edit`);
    } catch (e: any) {
      setError(e.message || 'No se pudo crear el setlist');
      setGuardando(false);
    }
  }

  return (
    <main className="max-w-md mx-auto p-4">
      <button className="text-sm text-muted mb-4" onClick={() => router.push('/')}>
        ← Volver
      </button>
      <h1 className="text-xl font-semibold mb-4">Nuevo setlist</h1>

      <label className="block text-xs text-muted mb-1">Nombre del show</label>
      <input
        autoFocus
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        placeholder="Show Tizayuca"
        className="w-full mb-4 px-3 py-2 rounded-lg border border-border bg-card"
      />

      {error && <div className="text-sm text-red-600 mb-3">{error}</div>}

      <button
        disabled={guardando}
        onClick={crear}
        className="w-full py-2.5 rounded-xl bg-accent text-white text-sm disabled:opacity-60"
      >
        {guardando ? 'Creando…' : 'Crear setlist'}
      </button>
    </main>
  );
}
