// Copyright (c) 2025 Jema Technology.
// Distributed under the license specified in the root directory of this project.

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
  preview: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
  optimizeDeps: {
    exclude: ['@ffmpeg/ffmpeg', '@ffmpeg/util'],
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'favicon.ico',
        'logo.svg',
        'pwa-192x192.png',
        'pwa-512x512.png',
        'ffmpeg/ffmpeg.min.js',
        'ffmpeg/ffmpeg-core.js'
      ],
      manifest: {
        name: 'Setsound - Suite Audio Complète',
        short_name: 'Setsound',
        description: 'Suite audio complète : découpeur, fusionneur, détecteur BPM et enregistreur',
        theme_color: '#8286ef',
        background_color: '#0A0A0A',
        display: 'standalone',
        orientation: 'portrait-primary',
        start_url: '/',
        scope: '/',
        categories: ['music', 'utilities', 'productivity'],
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      },
      workbox: {
        // Precache all build output assets
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,wasm}'],
        // Increase max file size for large JS bundles
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5 MB
        // Exclude large WASM files from precache (cached at runtime instead)
        globIgnores: ['**/ffmpeg-core.wasm'],
        // Clean up old precaches on activate
        cleanupOutdatedCaches: true,
        // Take control immediately on activation
        clientsClaim: true,
        // Skip waiting — apply updates right away
        skipWaiting: true,
        // Navigation fallback for SPA
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/^\/api/],
        runtimeCaching: [
          // Google Fonts stylesheets
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'google-fonts-stylesheets',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          // Google Fonts webfont files
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          // FFmpeg WASM files — cached after first use for offline support
          {
            urlPattern: /\/ffmpeg\/.*\.wasm$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'ffmpeg-wasm-cache',
              expiration: {
                maxEntries: 5,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200]
              },
              rangeRequests: true
            }
          }
        ]
      }
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },


})