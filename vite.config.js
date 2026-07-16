import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// ---------------------------------------------------------------------------
// GitHub Pages base path.
//   Repo at  https://<user>.github.io/muster/   ->  BASE_PATH = '/muster/'
//   Repo at  https://<user>.github.io/          ->  BASE_PATH = '/'
// Override without editing this file:  BASE_PATH=/my-repo/ npm run build
// ---------------------------------------------------------------------------
const base = process.env.BASE_PATH || '/muster/'

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/apple-touch-icon.png', 'icons/favicon.png'],
      manifest: {
        name: 'Muster — Attendance',
        short_name: 'Muster',
        description: 'Roll-call attendance for SY-A, SY-B and TY-B. Works offline.',
        theme_color: '#10161F',
        background_color: '#E9ECF0',
        display: 'standalone',
        orientation: 'portrait',
        scope: base,
        start_url: base,
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        // Fonts and the SheetJS chunk are bundled, so everything the app needs
        // — including export — is precached and works with no network at all.
        globPatterns: ['**/*.{js,css,html,png,svg,woff2}'],
        navigateFallback: base + 'index.html',
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024
      }
    })
  ]
})
