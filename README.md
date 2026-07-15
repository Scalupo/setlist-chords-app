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
- `app/setlists/new`, `app/setlists/[id]/edit`, `app/setlists/[id]/agregar` — crear/editar
  setlists, reordenar, quitar, buscar y agregar canciones, compartir por WhatsApp.
- `app/canciones/nueva` — editor manual de canciones **+ botón "Buscar con IA"** que llama a
  `app/api/generar-acordes` (función serverless) para generar un borrador de acordes por
  sección, que revisas y editas antes de guardar.
- `lib/chords.ts` — parseo y transporte de acordes, portado 1:1 del prototipo HTML.
- `lib/queries.ts` — consultas a Supabase (setlists, versiones, secciones, búsqueda).

## Variables de entorno necesarias

Además de las dos de Supabase, ahora se necesita:

- `ANTHROPIC_API_KEY` — tu clave de la API de Anthropic (se saca en console.anthropic.com).
  **Nunca** lleva el prefijo `NEXT_PUBLIC_` — así se queda solo en el servidor y nunca se expone
  en el navegador. Agrégala tanto en tu `.env.local` (para probar en tu compu) como en las
  Environment Variables de Vercel (para que funcione en producción).

## Qué falta portar (siguientes pasos)

- Manifest + service worker para que sea una PWA instalable y funcione offline de verdad
  (ahora mismo necesita internet porque lee de Supabase en cada carga).
- Selector de acorde guiado (chips en vez de texto libre) en el editor manual.
- Reordenar canciones arrastrando (hoy es con flechas ↑↓).


## Nota de seguridad

La `anon key` de Supabase es pública por diseño (vive en el navegador), y las políticas RLS
del schema están abiertas a propósito para esta v1 sin cuentas de usuario — ver la nota
correspondiente en `schema_supabase_acordes.sql` y en el documento de referencia.
