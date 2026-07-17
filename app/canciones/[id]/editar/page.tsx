'use client';

import { Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import CancionForm from '../../CancionForm';

export default function EditarCancionPage() {
  return (
    <Suspense fallback={<div className="p-6 text-center text-muted">Cargando…</div>}>
      <EditarCancionInner />
    </Suspense>
  );
}

function EditarCancionInner() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const setlistId = searchParams.get('setlistId') || undefined;
  const origen = searchParams.get('origen') as 'show' | 'setlist' | null;
  return <CancionForm versionIdToEdit={id} setlistId={setlistId} origen={origen} />;
}
