import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// GitHub Pages serves this repo at https://<user>.github.io/aws-docs-reader/,
// so all asset URLs must be prefixed with the repo name.
const BASE = '/aws-docs-reader/';

export default defineConfig({
  base: BASE,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // Only the app shell is precached; guide/TOC JSON under public/data is
      // fetched at runtime (NetworkFirst) so newly generated data shows up
      // without waiting for a full app update, and official doc pages are
      // never cached (requirements: 本文はオンライン前提).
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.includes('/data/'),
            handler: 'NetworkFirst',
            options: { cacheName: 'toc-data' },
          },
        ],
      },
      manifest: {
        name: 'AWS Docs Reader',
        short_name: 'AWS Docs',
        description: 'AWS公式ドキュメント通読の進捗管理',
        theme_color: '#232f3e',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: BASE,
        scope: BASE,
        icons: [
          { src: 'icons/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' },
        ],
      },
    }),
  ],
});
