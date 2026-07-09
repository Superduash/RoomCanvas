import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
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
