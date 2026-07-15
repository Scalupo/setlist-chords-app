const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  runtimeCaching: [
    {
      // Datos de Supabase (setlists, versiones, secciones): primero intenta la red
      // (para traer cambios recientes), y si no hay internet, usa lo último que se
      // guardó en caché -- así una canción/setlist ya abierta sigue disponible sin conexión.
      urlPattern: ({ url }) => url.hostname.endsWith('supabase.co'),
      handler: 'NetworkFirst',
      options: {
        cacheName: 'supabase-data',
        networkTimeoutSeconds: 4,
        expiration: { maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 30 },
        cacheableResponse: { statuses: [0, 200] },
      },
    },
    {
      // La página en sí (el HTML de cada pantalla): siempre intenta traer la versión
      // más reciente primero. Si no hay internet, cae a la última que se guardó --
      // así una pantalla ya visitada sigue abriendo offline, pero nunca se ve "vieja"
      // cuando sí hay conexión.
      urlPattern: ({ request }) => request.mode === 'navigate',
      handler: 'NetworkFirst',
      options: {
        cacheName: 'pages',
        networkTimeoutSeconds: 4,
        expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 * 30 },
        cacheableResponse: { statuses: [0, 200] },
      },
    },
    {
      // Archivos estáticos de la app (JS, CSS, íconos): estos sí se sirven al
      // instante desde caché, porque no cambian de contenido con cada visita.
      urlPattern: ({ request }) =>
        ['script', 'style', 'image', 'font'].includes(request.destination),
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'app-shell',
        expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
        cacheableResponse: { statuses: [0, 200] },
      },
    },
  ],
});

/** @type {import('next').NextConfig} */
const nextConfig = {};

module.exports = withPWA(nextConfig);
