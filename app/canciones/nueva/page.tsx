'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import CancionForm from '../CancionForm';

export default function NuevaCancionPage() {
  return (
    <Suspense fallback={<div className="p-6 text-center text-muted">Cargando…</div>}>
      <NuevaCancionInner />
    </Suspense>
  );
}

function NuevaCancionInner() {
  const searchParams = useSearchParams();
  const setlistId = searchParams.get('setlistId') || undefined;
  return <CancionForm setlistId={setlistId} />;
}
