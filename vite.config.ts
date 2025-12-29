import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [svelte({
    compilerOptions: {
      // Pure Svelte 5 - no compatibility mode
    }
  })],
  server: {
    host: '0.0.0.0',  // Bind to all interfaces for network access
    port: 5173,
    open: false  // Don't auto-open browser (we're on remote server)
  },
  build: {
    outDir: 'dist',
    // Zero config: minimal build, no code splitting complexity
    rollupOptions: {
      output: {
        // Single file output for simplicity (can be changed later)
        format: 'es'
      }
    }
  }
});

