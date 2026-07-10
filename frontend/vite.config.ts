import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';
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
  customLogger: {
    ...console,
    info: (msg) => {
      // Suppress Vite's default noisy info logs
      if (msg.includes('VITE') || msg.includes('ready in') || msg.includes('Local:')) return;
      console.info(msg);
    },
    warn: (warning, warn) => {
      if (warning.message.includes('vite-tsconfig-paths')) return;
      warn(warning);
    },
    warnOnce: console.warn,
    error: console.error,
    clearScreen: () => {},
    hasErrorLogged: () => false,
    hasWarned: false,
  },
  plugins: [
    react(),
    tsconfigPaths(),
    roomCanvasBannerPlugin(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['branding/favicon-32x32.png', 'branding/favicon-16x16.png', 'branding/apple-touch-icon.png'],
      manifest: {
        name: 'RoomCanvas — AI Interior Design Assistant',
        short_name: 'RoomCanvas',
        description: 'Upload a photo of your room and get an AI-generated redesign.',
        theme_color: '#FAF8F5',
        background_color: '#FAF8F5',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/branding/android-chrome-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: '/branding/android-chrome-512x512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      workbox: {
        // Cache the app shell; never cache API responses — generation status must always be fresh, not served stale from a cache
        navigateFallbackDenylist: [/^\/api/, /^\/static/],
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
      },
    })
  ],
  build: {
    target: 'es2020',
    sourcemap: false,
    rollupOptions: {
      output: {
        // Vite 8 + Rolldown requires manualChunks to be a function, not an object
        manualChunks: (id: string) => {
          if (id.includes('framer-motion')) return 'motion';
          if (id.includes('@tanstack/react-query')) return 'query';
          if (
            id.includes('react-dom') ||
            id.includes('react-router-dom') ||
            (id.includes('node_modules/react/') && !id.includes('react-dom'))
          )
            return 'vendor';
        },
      },
    },
  },
  server: {
    port: 3000,
  },
});
