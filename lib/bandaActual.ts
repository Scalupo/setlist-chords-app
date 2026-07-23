const KEY = 'ma_banda_actual_id';

/** Solo funciona en el navegador (no en servidor) — devuelve null si no hay ninguna guardada. */
export function getBandaActualId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(KEY);
}

export function setBandaActualId(id: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(KEY, id);
}
