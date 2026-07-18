import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

function roomCanvasBannerPlugin(): Plugin {
  return {
    name: 'roomcanvas-banner',
    configureServer(server) {
      server.httpServer?.once('listening', () => {
        setTimeout(() => {
          // Clear screen for a clean terminal experience
          console.clear();
          const port = server.config.server.port || 3000;
          console.log(`
══════════════════════════════════════════════
 RoomCanvas Frontend
══════════════════════════════════════════════
✓ React Ready
✓ API Connected
✓ Assets Loaded
Running: http://localhost:${port}
══════════════════════════════════════════════
`);
        }, 100);
      });
    },
  };
}

export default defineConfig({
  clearScreen: false,
  resolve: {
    tsconfigPaths: true,
  },
  customLogger: {
    ...console,
    info: (msg) => {
      // Suppress Vite's default noisy info logs
      if (msg.includes('VITE') || msg.includes('ready in') || msg.includes('Local:')) return;
      console.info(msg);
    },
    warn: console.warn,
    warnOnce: console.warn,
    error: console.error,
    clearScreen: () => {},
    hasErrorLogged: () => false,
    hasWarned: false,
  },
  plugins: [
    react(),
    roomCanvasBannerPlugin(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['branding/favicon-32x32.png', 'branding/favicon-16x16.png', 'branding/apple-touch-icon.png'],
      devOptions: {
        enabled: false
      },
      manifest: {
        name: 'RoomCanvas AI — Interior Design Assistant',
        short_name: 'RoomCanvas',
        description: 'Upload a photo of your room and get an AI-generated redesign.',
        theme_color: '#B76E4D',
        background_color: '#FAF8F5',
        display: 'standalone',
        orientation: 'portrait-primary',
        scope: '/',
        start_url: '/',
        categories: ['lifestyle', 'productivity', 'design'],
        icons: [
          { src: '/branding/android-chrome-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/branding/android-chrome-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/branding/android-chrome-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        shortcuts: [
          {
            name: 'New Design',
            short_name: 'Upload',
            description: 'Start a new room redesign',
            url: '/upload',
            icons: [{ src: '/branding/android-chrome-192x192.png', sizes: '192x192', type: 'image/png' }]
          }
        ]
      },
      workbox: {
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true,
        navigateFallbackDenylist: [/^\/api/, /^\/static/],
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'gstatic-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      },
    })
  ],
  build: {
    target: ['es2022', 'chrome100', 'firefox100', 'safari15'],
    sourcemap: false,
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: (id: string) => {
          if (id.includes('framer-motion')) return 'vendor-motion';
          if (id.includes('@tanstack/react-query')) return 'vendor-query';
          if (id.includes('firebase/')) return 'vendor-firebase';
          if (id.includes('@radix-ui/')) return 'vendor-radix';
          if (id.includes('lucide-react')) return 'vendor-icons';
          if (id.includes('react-dropzone') || id.includes('react-image-crop')) return 'vendor-forms';
          if (id.includes('node_modules/three/')) return 'vendor-three';
          if (id.includes('node_modules/@react-three/')) return 'vendor-r3f';
          if (
            id.includes('react-dom') ||
            id.includes('react-router-dom') ||
            (id.includes('node_modules/react/') && !id.includes('react-dom'))
          ) {
            return 'vendor-react';
          }
        },
      },
    },
  },
  server: {
    port: 3000,
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
    },
  },
});
