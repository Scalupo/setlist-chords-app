import { supabase } from './supabase';
import { Setlist, SetlistItemRow, Version } from './types';
import { parseChordToken } from './chords';

export async function getSetlists(): Promise<Setlist[]> {
  const { data, error } = await supabase
    .from('setlists')
    .select('id, id_corto, nombre, banda_id, fecha, lugar')
    .order('creado_en', { ascending: false });
  if (error) throw error;
  return data as Setlist[];
}

export async function getSetlist(id: string): Promise<Setlist | null> {
  const { data, error } = await supabase
    .from('setlists')
    .select('id, id_corto, nombre, banda_id, fecha, lugar')
    .eq('id', id)
    .single();
  if (error) return null;
  return data as Setlist;
}

/** Trae las versiones de canciones de un setlist, ya ordenadas, con sus secciones y acordes. */
export async function getSetlistVersions(setlistId: string): Promise<Version[]> {
  const { data, error } = await supabase
    .from('setlist_canciones')
    .select(
      `orden,
       versiones (
         id, cancion_id, etiqueta_version, tono_original, capo,
         canciones ( titulo, artista ),
         secciones ( id, tipo, etiqueta, orden, acordes, letra )
       )`
    )
    .eq('setlist_id', setlistId)
    .order('orden', { ascending: true });

  if (error) throw error;

  const rows = (data || []) as unknown as SetlistItemRow[];
  return rows.map((row) => {
    const v = row.versiones;
    return {
      ...v,
      secciones: [...v.secciones].sort((a, b) => a.orden - b.orden),
    };
  });
}

/** Devuelve la primera banda que encuentre, o crea una por default.
 *  Simplificación de v1: todavía no hay pantalla de gestión de bandas. */
export async function getOrCreateBandaId(): Promise<string> {
  const { data: existente } = await supabase.from('bandas').select('id').limit(1).maybeSingle();
  if (existente) return existente.id;
  const { data: nueva, error } = await supabase
    .from('bandas')
    .insert({ nombre: 'Mi banda' })
    .select('id')
    .single();
  if (error || !nueva) throw error || new Error('No se pudo crear la banda por default');
  return nueva.id;
}

/** Crea un setlist vacío con un id_corto generado por la función de Postgres. */
export async function createSetlist(nombre: string): Promise<string> {
  const bandaId = await getOrCreateBandaId();
  const { data: idCorto, error: e1 } = await supabase.rpc('generar_id_corto');
  if (e1) throw e1;
  const { data, error } = await supabase
    .from('setlists')
    .insert({ nombre, banda_id: bandaId, id_corto: idCorto })
    .select('id')
    .single();
  if (error || !data) throw error || new Error('No se pudo crear el setlist');
  return data.id;
}

export async function updateSetlistNombre(id: string, nombre: string) {
  const { error } = await supabase.from('setlists').update({ nombre }).eq('id', id);
  if (error) throw error;
}

/** Sobrescribe el orden de las canciones de un setlist según el arreglo de version_id recibido. */
export async function reorderSetlist(setlistId: string, versionIdsEnOrden: string[]) {
  await Promise.all(
    versionIdsEnOrden.map((versionId, i) =>
      supabase
        .from('setlist_canciones')
        .update({ orden: i + 1 })
        .eq('setlist_id', setlistId)
        .eq('version_id', versionId)
    )
  );
}

export async function removeFromSetlist(setlistId: string, versionId: string) {
  const { error } = await supabase
    .from('setlist_canciones')
    .delete()
    .eq('setlist_id', setlistId)
    .eq('version_id', versionId);
  if (error) throw error;
}

export async function addVersionToSetlist(setlistId: string, versionId: string) {
  const { count } = await supabase
    .from('setlist_canciones')
    .select('*', { count: 'exact', head: true })
    .eq('setlist_id', setlistId);
  const { error } = await supabase
    .from('setlist_canciones')
    .insert({ setlist_id: setlistId, version_id: versionId, orden: (count || 0) + 1 });
  if (error) throw error;
}

export type VersionBusqueda = {
  id: string;
  etiqueta_version: string;
  titulo: string;
  artista: string;
};

/** Busca versiones existentes por título o artista, para el buscador de "agregar canción". */
export async function searchVersions(query: string): Promise<VersionBusqueda[]> {
  let req = supabase
    .from('versiones')
    .select('id, etiqueta_version, canciones!inner(titulo, artista)')
    .order('creado_en', { ascending: false })
    .limit(30);
  if (query.trim()) {
    req = req.or(`titulo.ilike.%${query}%,artista.ilike.%${query}%`, { foreignTable: 'canciones' });
  }
  const { data, error } = await req;
  if (error) throw error;
  return (data || []).map((r: any) => ({
    id: r.id,
    etiqueta_version: r.etiqueta_version,
    titulo: r.canciones.titulo,
    artista: r.canciones.artista,
  }));
}

export type SeccionInput = {
  tipo: string;
  etiqueta: string;
  acordesTexto: string; // "G Em Cadd9 D" -> se parsea antes de guardar
  letra: string;
};

/** Crea una canción + versión + secciones nuevas, y opcionalmente la agrega a un setlist. */
export async function createCancionVersion(input: {
  titulo: string;
  artista: string;
  etiquetaVersion: string;
  tono: string;
  secciones: SeccionInput[];
  agregarASetlistId?: string;
}): Promise<string> {
  const { data: cancion, error: e1 } = await supabase
    .from('canciones')
    .insert({ titulo: input.titulo, artista: input.artista })
    .select('id')
    .single();
  if (e1 || !cancion) throw e1;

  const { data: version, error: e2 } = await supabase
    .from('versiones')
    .insert({
      cancion_id: cancion.id,
      etiqueta_version: input.etiquetaVersion || 'Estudio',
      tono_original: input.tono || null,
    })
    .select('id')
    .single();
  if (e2 || !version) throw e2;

  const filas = input.secciones.map((s, i) => ({
    version_id: version.id,
    tipo: s.tipo,
    etiqueta: s.etiqueta,
    orden: i + 1,
    acordes: s.acordesTexto
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((tok) => parseChordToken(tok)),
    letra: s.letra || null,
  }));
  if (filas.length > 0) {
    const { error: e3 } = await supabase.from('secciones').insert(filas);
    if (e3) throw e3;
  }

  if (input.agregarASetlistId) {
    await addVersionToSetlist(input.agregarASetlistId, version.id);
  }

  return version.id;
}

