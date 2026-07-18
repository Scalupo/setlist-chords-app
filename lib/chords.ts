import { Acorde } from './types';

const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const FLAT_EQUIV: Record<string, string> = {
  Db: 'C#',
  Eb: 'D#',
  Gb: 'F#',
  Ab: 'G#',
  Bb: 'A#',
};

/** Convierte un token de texto (ej. "Cm7", "G/B") a un objeto Acorde estructurado. */
export function parseChordToken(tok: string): Acorde {
  const m = tok.match(/^([A-Ga-g])([#b]?)(.*)$/);
  if (!m) return { raiz: tok, calidad: '', bajo: null };
  const raiz = m[1].toUpperCase() + m[2];
  const resto = m[3];
  const bassMatch = resto.match(/^(.*)\/([A-Ga-g][#b]?)$/);
  if (bassMatch) {
    const bajo = bassMatch[2][0].toUpperCase() + (bassMatch[2][1] || '');
    return { raiz, calidad: bassMatch[1], bajo };
  }
  return { raiz, calidad: resto, bajo: null };
}

function transposeNote(note: string, semitones: number): string {
  const normalized = FLAT_EQUIV[note] || note;
  const idx = NOTES.indexOf(normalized);
  if (idx === -1) return note;
  return NOTES[(idx + semitones + 120) % 12];
}

/** Transporta un acorde estructurado N semitonos. Es matemática pura, sin red. */
export function transposeChord(chord: Acorde, semitones: number): Acorde {
  return {
    raiz: transposeNote(chord.raiz, semitones),
    calidad: chord.calidad,
    bajo: chord.bajo ? transposeNote(chord.bajo, semitones) : null,
    duracion: chord.duracion,
  };
}

/** Formatea un acorde estructurado de vuelta a texto legible, ej. "Cm7/G". */
export function chordToLabel(chord: Acorde): string {
  return chord.raiz + chord.calidad + (chord.bajo ? '/' + chord.bajo : '');
}

const MAX_DURACION = 5;

/**
 * Convierte una línea de texto como "C     Bb E F       D" en acordes
 * estructurados, usando la cantidad de espacios entre uno y otro para
 * marcar cuánto dura ese acorde antes de cambiar al siguiente (1 espacio =
 * normal, más espacios = dura más). Así, un músico puede escribir los
 * acordes espaciándolos igual que los "ve" en el compás.
 */
export function parseAcordesLinea(texto: string): Acorde[] {
  const acordes: Acorde[] = [];
  const regex = /(\S+)(\s*)/g;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(texto)) !== null) {
    const chord = parseChordToken(m[1]);
    const espacios = m[2].length;
    const duracion = Math.min(Math.max(espacios, 1), MAX_DURACION);
    acordes.push({ ...chord, duracion });
  }
  return acordes;
}

/** El inverso de parseAcordesLinea: reconstruye el texto respetando el espaciado guardado. */
export function acordesToLinea(acordes: Acorde[]): string {
  return acordes
    .map((a, i) => {
      const label = chordToLabel(a);
      if (i === acordes.length - 1) return label;
      return label + ' '.repeat(Math.max(a.duracion || 1, 1));
    })
    .join('');
}
