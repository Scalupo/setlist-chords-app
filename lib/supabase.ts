import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

if (!url || !anonKey) {
  // No lanzamos error en build, solo avisamos en consola del navegador,
  // para no romper el build si todavía no has llenado .env.local
  console.warn('Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY en .env.local');
}

export const supabase = createClient(url, anonKey, {
  global: {
    // Next.js intercepta fetch() y lo cachea por default en el servidor.
    // Sin esto, Vercel podía guardar la primera respuesta de Supabase y
    // seguir sirviéndola vieja en visitas futuras, sin volver a consultar.
    fetch: (input, init) => fetch(input, { ...init, cache: 'no-store' }),
  },
});
