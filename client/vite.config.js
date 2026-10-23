import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  const isMobile = mode === 'mobile';
  const accountScopedCacheKey = {
    cacheKeyWillBeUsed: async ({ request }) => {
      const authorization = request.headers.get('authorization');
      if (!authorization) return request;

      const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(authorization));
      const hash = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
      const cacheUrl = new URL(request.url);
      cacheUrl.searchParams.set('__offline_account', hash);
      return new Request(cacheUrl.toString(), {
        headers: request.headers,
        credentials: request.credentials,
        mode: request.mode,
      });
    },
  };

  return {
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['logo.svg', 'favicon.svg'],
        devOptions: {
          enabled: false,       // SW disabled in dev — autoUpdate + HMR causes constant reloads
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
          cleanupOutdatedCaches: true,
          skipWaiting: true,
          clientsClaim: true,
          navigateFallback: '/index.html',
          navigateFallbackDenylist: [/^\/api\//],
          maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
          globPatterns: ['**/*.{js,css,svg,woff2}'],
          runtimeCaching: [
            // Driver critical data — long cache, served from cache when offline
            {
              urlPattern: /\/api\/(products|customers|routes|loading-sheets|warehouses|stock|free-allocations)/,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'driver-data-cache',
                expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 8 }, // 8 hours
                networkTimeoutSeconds: 8,
                plugins: [accountScopedCacheKey],
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
                plugins: [accountScopedCacheKey],
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
      target: ['es2015', 'safari13'],
    },
  };
});
