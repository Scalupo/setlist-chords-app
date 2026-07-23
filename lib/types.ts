export type Acorde = {
  raiz: string;
  calidad: string;
  bajo: string | null;
  duracion?: number; // 1 = normal; más alto = dura más antes de cambiar al siguiente
};

export type Seccion = {
  id: string;
  tipo: 'intro' | 'verso' | 'precoro' | 'coro' | 'puente' | 'solo' | 'outro' | 'otro';
  etiqueta: string;
  orden: number;
  acordes: Acorde[];
  letra: string | null;
};

export type Cancion = {
  titulo: string;
  artista: string;
  banda_id: string;
};

export type Version = {
  id: string;
  cancion_id: string;
  etiqueta_version: string;
  tono_original: string | null;
  capo: number | null;
  canciones: Cancion;
  secciones: Seccion[];
};

export type Banda = {
  id: string;
  nombre: string;
  creado_en: string;
};

export type Setlist = {
  id: string;
  id_corto: string;
  nombre: string;
  banda_id: string;
  fecha: string | null;
  lugar: string | null;
};

// Fila cruda que regresa la consulta a setlist_canciones (ver lib/queries.ts)
export type SetlistItemRow = {
  orden: number;
  versiones: Version;
};
