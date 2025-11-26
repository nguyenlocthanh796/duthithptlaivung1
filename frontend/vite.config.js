import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'robots.txt', 'apple-touch-icon.png'],
      manifest: {
        name: 'DuThi THPT Luyện Thi',
        short_name: 'DuThi',
        description: 'Nền tảng mạng xã hội + AI luyện thi THPT',
        theme_color: '#2563eb',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: '/icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      },
      workbox: {
        // Tăng giới hạn file size để cache bundle lớn (face-api.js, Firebase, etc.)
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5 MB
        // Exclude models folder khỏi precache (load on-demand)
        globIgnores: ['**/models/**'],
        // Runtime caching cho các assets lớn
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
            },
          },
        ],
      },
    }),
  ],
  // Phần server phải nằm ở đây (bên ngoài plugins)
  server: {
    allowedHosts: true,
  },
  // Tối ưu build - tăng tốc độ load
  build: {
    // Chunk size warning limit
    chunkSizeWarningLimit: 1000,
    // Minify và optimize - dùng esbuild (nhanh hơn terser)
    minify: 'esbuild',
    // Tối ưu sourcemap cho production
    sourcemap: false,
    // Tối ưu CSS
    cssCodeSplit: true,
    // Tối ưu assets
    assetsInlineLimit: 4096, // Inline assets < 4KB
    rollupOptions: {
      output: {
        // Manual chunks để tách các thư viện lớn - tối ưu cho code splitting
        manualChunks: (id) => {
          // React core
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/')) {
            return 'react-vendor'
          }
          // React Router
          if (id.includes('node_modules/react-router')) {
            return 'react-router-vendor'
          }
          // Firebase - tách riêng từng service để lazy load tốt hơn
          if (id.includes('node_modules/firebase/')) {
            if (id.includes('firebase/auth')) return 'firebase-auth'
            if (id.includes('firebase/firestore')) return 'firebase-firestore'
            if (id.includes('firebase/storage')) return 'firebase-storage'
            if (id.includes('firebase/database')) return 'firebase-database'
            if (id.includes('firebase/messaging')) return 'firebase-messaging'
            if (id.includes('firebase/functions')) return 'firebase-functions'
            if (id.includes('firebase/remote-config')) return 'firebase-remote-config'
            if (id.includes('firebase/analytics')) return 'firebase-analytics'
            return 'firebase-core'
          }
          // UI libraries
          if (id.includes('node_modules/@headlessui') || id.includes('node_modules/@heroicons')) {
            return 'ui-vendor'
          }
          // Lucide React - tách riêng vì lớn
          if (id.includes('node_modules/lucide-react')) {
            return 'lucide-vendor'
          }
          // Math rendering
          if (id.includes('node_modules/katex') || id.includes('node_modules/react-katex')) {
            return 'math-vendor'
          }
          // Charts
          if (id.includes('node_modules/recharts')) {
            return 'chart-vendor'
          }
          // Day.js
          if (id.includes('node_modules/dayjs')) {
            return 'dayjs-vendor'
          }
          // Axios
          if (id.includes('node_modules/axios')) {
            return 'axios-vendor'
          }
        },
        // Tối ưu tên file chunks
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: 'assets/[ext]/[name]-[hash].[ext]',
      },
    },
  },
})