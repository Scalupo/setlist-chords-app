# setlist-chords-app

Esqueleto de Next.js (App Router) + Supabase para la app de acordes en vivo.
Ya conectado al proyecto de Supabase `setlist-chords` (aislado de kiniela.vip).

## Cómo arrancarlo

```bash
npm install
cp .env.local.example .env.local
```

Abre `.env.local` y pega tu **anon key**:
Dashboard de Supabase → proyecto `setlist-chords` → Settings → API → "anon public".
El Project URL ya viene prellenado en el archivo de ejemplo.

```bash
npm run dev
```

Abre `http://localhost:3000` — deberías ver el setlist de prueba **"Show demo"** (ID corto `W651`),
ya sembrado en la base de datos. Dale a "Abrir en modo show" para probar todo:
cajón deslizable, transporte de tono, swipe (en escritorio simula con las flechas de navegación
de abajo), tema claro/oscuro, y el toggle músico/vocalista.

## Qué ya funciona

- `app/page.tsx` — lista de setlists (lee directo de Supabase).
- `app/show/[id]/page.tsx` — modo show completo: drawer con auto-peek, transporte de tono en
  tiempo real (sin llamadas a red, es matemática pura sobre `lib/chords.ts`), swipe táctil,
  tema claro/oscuro, modo músico/vocalista.
- `lib/chords.ts` — parseo y transporte de acordes, portado 1:1 del prototipo HTML.
- `lib/queries.ts` — consultas a Supabase (setlists y sus versiones/secciones).

## Qué falta portar (siguientes pasos)

Esto quedó fuera de este primer esqueleto a propósito, para priorizar validar modo show:

- Pantalla de crear/editar setlist (reordenar canciones, ID corto visible, compartir).
- Buscador para agregar canción al setlist (con versiones diferenciadas).
- Editor de canción (agregar secciones, insertar/quitar acordes, campo de letra).
- Función serverless que llame a la API de Anthropic con el prompt de captura
  (`prompt_captura_acordes.md`) — nunca poner la API key en código de cliente.
- Manifest + service worker para que sea una PWA instalable y funcione offline de verdad
  (ahora mismo necesita internet porque lee de Supabase en cada carga).
- `navigator.share()` para compartir el link del setlist por WhatsApp.

## Nota de seguridad

La `anon key` de Supabase es pública por diseño (vive en el navegador), y las políticas RLS
del schema están abiertas a propósito para esta v1 sin cuentas de usuario — ver la nota
correspondiente en `schema_supabase_acordes.sql` y en el documento de referencia.
