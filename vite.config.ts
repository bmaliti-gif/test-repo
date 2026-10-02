import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'BoardZM — rooms in Lusaka',
        short_name: 'BoardZM',
        description: 'Find a room near campus in Lusaka from verified landlords. Reserve with mobile money.',
        lang: 'en',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        theme_color: '#0f766e',
        background_color: '#f7f6f3',
        categories: ['lifestyle', 'education'],
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Only the core is saved up front (start page, main script and styles, icons, the Latin
        // fonts), so a first visit stays light on data. Other screens are saved when first opened.
        globPatterns: ['index.html', 'assets/index-*.{js,css}', 'assets/supabase-*.js', '*.{svg,png}', 'assets/*-latin-[0-9]*-normal-*.woff2'],
        navigateFallback: '/index.html',
        // Never treat sign-in links as app pages.
        navigateFallbackDenylist: [/^\/auth\//],
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            // Screens loaded on demand: file names change with every release, so cache first is safe.
            urlPattern: ({ url, sameOrigin }) => sameOrigin && url.pathname.startsWith('/assets/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'app-screens',
              expiration: { maxEntries: 80, maxAgeSeconds: 60 * 60 * 24 * 60 },
            },
          },
          {
            // Public room photos and ad images: cache first, they never change at the same address.
            urlPattern: ({ url }) =>
              url.hostname.endsWith('.supabase.co') &&
              /\/storage\/v1\/object\/public\/(listing-photos|ad-images)\//.test(url.pathname),
            handler: 'CacheFirst',
            options: {
              cacheName: 'room-photos',
              expiration: { maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Map tiles: reuse what's already downloaded, refresh in the background.
            urlPattern: ({ url }) => url.hostname === 'tile.openstreetmap.org',
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'map-tiles',
              expiration: { maxEntries: 400, maxAgeSeconds: 60 * 60 * 24 * 14 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          // Everything else from Supabase (sign-in, data, payments, admin, private
          // verification documents) is never cached: it always goes to the network.
        ],
      },
    }),
  ],
  test: {
    environment: 'node',
  },
});
