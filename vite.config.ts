import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-supabase': ['@supabase/supabase-js'],
          'vendor-ui': ['framer-motion', 'lucide-react'],
          'vendor-markdown': ['react-markdown', 'remark-gfm', 'marked'],
          'vendor-charts': ['recharts'],
          'vendor-docs': ['mammoth', 'xlsx', 'pdfjs-dist'],
          'vendor-ogl': ['ogl'],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
    sourcemap: false,
  },
  optimizeDeps: {
    exclude: ['mammoth', 'xlsx', 'pdfjs-dist'],
    include: ['@supabase/supabase-js', 'react', 'react-dom'],
  },
});