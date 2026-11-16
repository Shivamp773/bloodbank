import { fileURLToPath } from 'node:url';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

const repoRoot = fileURLToPath(new URL('..', import.meta.url));

export default defineConfig(({ mode }) => {
  // The API port comes from the same optional root .env file that the server reads.
  const env = loadEnv(mode, repoRoot, '');
  const proxy = { '/api': { target: `http://127.0.0.1:${env.PORT || 8080}`, changeOrigin: true } };

  return {
    plugins: [react()],
    server: { port: 5173, proxy },
    preview: { port: 4173, proxy },
    build: {
      rollupOptions: {
        output: {
          // Keep the large charting library out of the main bundle so the first page loads faster.
          manualChunks(id) {
            if (id.includes('node_modules/recharts') || id.includes('node_modules/d3-')) return 'charts';
            return undefined;
          },
        },
      },
    },
    test: {
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.js'],
      css: false,
    },
  };
});
