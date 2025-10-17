import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      // Removed explicit input configuration - Vite auto-detects index.html
    }
  },
  optimizeDeps: {
    exclude: [],
    include: ['pdfjs-dist', 'mammoth', 'xlsx']
  },
});