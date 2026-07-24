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
            { src: 'logo.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,svg,woff2}'],
          runtimeCaching: [
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
