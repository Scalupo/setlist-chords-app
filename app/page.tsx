import Link from 'next/link';
import { getSetlists } from '@/lib/queries';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const setlists = await getSetlists();

  return (
    <main className="max-w-md mx-auto p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-semibold">Tus setlists</h1>
        <Link href="/canciones" className="text-sm text-accent underline">
          Tus canciones
        </Link>
      </div>

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
