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
      // El resto de la app (JS, CSS, la página en sí): se sirve de caché al instante
      // y se actualiza en segundo plano cuando hay internet.
      urlPattern: () => true,
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
