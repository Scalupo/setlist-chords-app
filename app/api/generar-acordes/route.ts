import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 60;

const SYSTEM_PROMPT = `Eres un asistente especializado en transcribir acordes de canciones populares para una app de músicos en vivo. Tu única salida es un objeto JSON válido, sin texto adicional, sin explicaciones, sin bloques de markdown (nada de \`\`\`json).

TAREA
Dado un título de canción, artista y (opcionalmente) una versión específica, busca en la web fuentes confiables de acordes para guitarra/piano, contrasta al menos dos fuentes cuando sea posible, y devuelve la estructura de la canción dividida en secciones con sus acordes.

QUÉ NO HACER
- Nunca incluyas la letra de la canción, ni completa ni parcial. Solo acordes y nombres de sección.
- Nunca copies texto largo de ninguna fuente. Solo extraes los símbolos de acorde (ej. "Cm7", "G/B", "Dsus4").
- Si las fuentes no coinciden entre sí en algún acorde, prioriza la versión que aparezca en más fuentes; si hay empate, usa la más simple y marca esa sección con "confianza": "baja".

FORMATO DE CADA ACORDE
Cada acorde es un objeto, nunca texto libre suelto:
{ "raiz": "C", "calidad": "m7", "bajo": null }

CATÁLOGO DE CALIDADES COMUNES (referencia, no lista cerrada):
"", "m", "7", "maj7", "m7", "6", "m6", "9", "m9", "sus2", "sus4", "add9", "dim", "dim7", "aug", "11", "13", "7sus4", "7b9", "7#5", "6/9"

TIPOS DE SECCIÓN VÁLIDOS
"intro", "verso", "precoro", "coro", "puente", "solo", "outro", "otro"

SI NO ENCUENTRAS LA CANCIÓN O LA VERSIÓN
Devuelve el JSON con "encontrada": false y "secciones": [] en vez de inventar acordes.

SI ENCUENTRAS MÚLTIPLES VERSIONES Y NO SE ESPECIFICÓ CUÁL
Usa la versión de estudio/original por default, y menciona en "notas" qué otras versiones detectaste.

FORMATO DE SALIDA (JSON exacto, sin nada más en la respuesta):
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

  const userMessage = `Canción: ${titulo}\nArtista: ${artista}\nVersión: ${version}`;

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
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userMessage }],
        tools: [{ type: 'web_search_20260318', name: 'web_search' }],
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
