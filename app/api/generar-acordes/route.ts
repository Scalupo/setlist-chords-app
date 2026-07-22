import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 60;

const REGLAS_COMUNES = `
QUÉ NO HACER
- Nunca incluyas la letra de la canción, ni completa ni parcial, aunque la fuente la tenga. Solo acordes y nombres de sección.
- Nunca copies texto largo de ninguna fuente. Solo extraes los símbolos de acorde (ej. "Cm7", "G/B", "Dsus4").
- Si hay ambigüedad en algún acorde, marca esa sección con "confianza": "baja".

FORMATO DE CADA ACORDE
Cada acorde es un objeto, nunca texto libre suelto:
{ "raiz": "C", "calidad": "m7", "bajo": null }

CATÁLOGO DE CALIDADES COMUNES (referencia, no lista cerrada):
"", "m", "7", "maj7", "m7", "6", "m6", "9", "m9", "sus2", "sus4", "add9", "dim", "dim7", "aug", "11", "13", "7sus4", "7b9", "7#5", "6/9"

TIPOS DE SECCIÓN VÁLIDOS
"intro", "verso", "precoro", "coro", "puente", "solo", "outro", "otro"

SI NO ENCUENTRAS ACORDES CLAROS
Devuelve el JSON con "encontrada": false y "secciones": [] en vez de inventar acordes.

FORMATO DE SALIDA (JSON exacto, sin nada más en la respuesta, sin \`\`\`json):
{
  "encontrada": true,
  "titulo": "Perfect",
  "artista": "Ed Sheeran",
  "version_detectada": "estudio",
  "tono_original": "G",
  "confianza_general": "alta",
  "notas": "",
  "secciones": [
    {
      "tipo": "intro",
      "etiqueta": "Intro",
      "confianza": "alta",
      "acordes": [
        {"raiz": "G", "calidad": "", "bajo": null},
        {"raiz": "E", "calidad": "m", "bajo": null}
      ]
    }
  ]
}`;

const SYSTEM_PROMPT_BUSQUEDA = `Eres un asistente especializado en transcribir acordes de canciones populares para una app de músicos en vivo. Tu única salida es un objeto JSON válido, sin texto adicional.

TAREA
Dado un título de canción, artista y (opcionalmente) una versión específica, busca en la web fuentes confiables de acordes para guitarra/piano y devuelve la estructura de la canción dividida en secciones con sus acordes. Usa como máximo 2 búsquedas -- prioriza velocidad, no satures de búsquedas.
${REGLAS_COMUNES}`;

const SYSTEM_PROMPT_LINK = `Eres un asistente especializado en transcribir acordes de canciones populares para una app de músicos en vivo. Tu única salida es un objeto JSON válido, sin texto adicional.

TAREA
Se te da el contenido de texto de una página web específica que el usuario eligió como referencia de acordes. Extrae de ahí la estructura de la canción dividida en secciones con sus acordes. No busques en internet, usa solo el contenido que se te da.
${REGLAS_COMUNES}`;

function extraerTextoDeHtml(html: string): string {
  const texto = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|tr|h[1-6])>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return texto.slice(0, 15000);
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'Falta configurar ANTHROPIC_API_KEY en las variables de entorno del servidor.' },
      { status: 500 }
    );
  }

  const body = await req.json().catch(() => null);
  const titulo = body?.titulo?.trim();
  if (!titulo) {
    return NextResponse.json({ error: 'Falta el título de la canción.' }, { status: 400 });
  }
  const artista = body?.artista?.trim() || 'no especificado';
  const version = body?.version?.trim() || 'no especificada';
  const link = body?.link?.trim();

  let system = SYSTEM_PROMPT_BUSQUEDA;
  let messages: any[];
  let tools: any[] | undefined = [{ type: 'web_search_20260318', name: 'web_search', max_uses: 2 }];

  if (link) {
    let paginaTexto: string;
    try {
      const pageRes = await fetch(link, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SetlistChordsBot/1.0)' },
      });
      if (!pageRes.ok) throw new Error(`status ${pageRes.status}`);
      const html = await pageRes.text();
      paginaTexto = extraerTextoDeHtml(html);
      if (!paginaTexto) throw new Error('sin contenido de texto');
    } catch (e: any) {
      return NextResponse.json(
        { error: 'No se pudo abrir ese link. Revisa que sea correcto y público, o intenta sin link.' },
        { status: 400 }
      );
    }
    system = SYSTEM_PROMPT_LINK;
    tools = undefined;
    messages = [
      {
        role: 'user',
        content: `Canción: ${titulo}\nArtista: ${artista}\nVersión: ${version}\n\nContenido de la página de referencia:\n${paginaTexto}`,
      },
    ];
  } else {
    messages = [{ role: 'user', content: `Canción: ${titulo}\nArtista: ${artista}\nVersión: ${version}` }];
  }

  let anthropicRes: Response;
  try {
    anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-5',
        max_tokens: 3000,
        system,
        messages,
        ...(tools ? { tools } : {}),
      }),
    });
  } catch (e: any) {
    return NextResponse.json({ error: 'No se pudo contactar a la API de Anthropic.' }, { status: 502 });
  }

  if (!anthropicRes.ok) {
    const detail = await anthropicRes.text();
    return NextResponse.json(
      { error: `La API de Anthropic respondió con error (${anthropicRes.status}).`, detail },
      { status: 502 }
    );
  }

  const data = await anthropicRes.json();
  const textBlocks = (data.content || [])
    .filter((b: any) => b.type === 'text')
    .map((b: any) => b.text as string);
  const raw = textBlocks.join('\n').trim();

  let parsed: any;
  try {
    const cleaned = raw.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
    parsed = JSON.parse(cleaned);
  } catch {
    return NextResponse.json(
      { error: 'La IA no devolvió un JSON válido. Intenta de nuevo o captúrala manual.', raw },
      { status: 502 }
    );
  }

  return NextResponse.json(parsed);
}
