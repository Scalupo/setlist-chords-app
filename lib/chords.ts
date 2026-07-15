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
  };
}

/** Formatea un acorde estructurado de vuelta a texto legible, ej. "Cm7/G". */
export function chordToLabel(chord: Acorde): string {
  return chord.raiz + chord.calidad + (chord.bajo ? '/' + chord.bajo : '');
}
