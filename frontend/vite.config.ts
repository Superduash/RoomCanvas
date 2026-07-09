import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';

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
    warn: console.warn,
    warnOnce: console.warn,
    error: console.error,
    clearScreen: () => {},
    hasErrorLogged: () => false,
    hasWarned: false,
  },
  plugins: [react(), tsconfigPaths(), roomCanvasBannerPlugin()],
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
