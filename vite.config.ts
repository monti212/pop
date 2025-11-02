import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // React core libraries
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          // UI and animation libraries
          'ui-vendor': ['framer-motion', 'lucide-react'],
          // Document parsers - lazy loaded
          'doc-parsers-pdf': ['pdfjs-dist'],
          'doc-parsers-office': ['mammoth', 'xlsx'],
          // Editor libraries
          'editor': ['react-quill', 'quill'],
          // Charts and visualization
          'charts': ['recharts'],
          // Supabase client
          'supabase': ['@supabase/supabase-js']
        }
      }
    },
    chunkSizeWarningLimit: 1000,
    target: 'es2020',
    minify: 'esbuild'
  },
  optimizeDeps: {
    exclude: [],
    include: ['react', 'react-dom', 'react-router-dom']
  },
});