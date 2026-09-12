import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueDevTools(),
    VitePWA({
      includeAssets: ['icon.png'],
      manifest: {
        name: 'Habits PWA',
        short_name: 'Habits',
        description: 'A Progressive Web-App made to help teens with daily habits',
        theme_color: '#ffffff',
        icons: [
          {
            src: 'icon.png',
            sizes: '150x150',
            type: 'image/png'
          }
        ]
      },
      registerType: 'autoUpdate',
      workbox: {
        // Tells the PWA service worker to never intercept URLs containing /verify/
        navigateFallbackDenylist: [/^\/verify\//, /^\/api\//]
      }
    })
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    minify: false
  },
  esbuild: {
    // 3. Keep your original variable and function names
    mangleProps: false,
    reserveProps: [],
  }
})
