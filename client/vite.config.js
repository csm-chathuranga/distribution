import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  const isMobile = mode === 'mobile';

  return {
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['logo.svg', 'favicon.svg'],
        devOptions: {
          enabled: true,        // service worker active in `vite dev` so beforeinstallprompt fires
          type: 'module',
        },
        manifest: {
          name: 'Lanka Dist — Distribution System',
          short_name: 'Lanka Dist',
          description: 'Distribution Management System',
          theme_color: '#0f172a',
          background_color: '#0f172a',
          display: 'standalone',
          orientation: 'portrait',
          start_url: '/',
          icons: [
            { src: 'logo.svg',     sizes: 'any',     type: 'image/svg+xml', purpose: 'any maskable' },
            { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
            { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
          ],
        },
        workbox: {
          maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
          globPatterns: ['**/*.{js,css,html,svg,woff2}'],
          runtimeCaching: [
            // Driver critical data — long cache, served from cache when offline
            {
              urlPattern: /\/api\/(products|customers|routes|loading-sheets|warehouses)/,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'driver-data-cache',
                expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 8 }, // 8 hours
                networkTimeoutSeconds: 8,
              },
            },
            // All other API calls — short cache
            {
              urlPattern: /^https?:\/\/.*\/api\//,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'api-cache',
                expiration: { maxEntries: 100, maxAgeSeconds: 300 },
                networkTimeoutSeconds: 10,
              },
            },
          ],
        },
      }),
    ],
    server: isMobile ? {} : {
      port: 5173,
      proxy: {
        '/api': { target: 'http://localhost:5000', changeOrigin: true },
        '/socket.io': { target: 'http://localhost:5000', changeOrigin: true, ws: true },
      },
    },
    build: {
      outDir: 'dist',
    },
  };
});
