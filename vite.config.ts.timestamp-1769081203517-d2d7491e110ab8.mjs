// vite.config.ts
import { defineConfig } from "file:///home/project/node_modules/vite/dist/node/index.js";
import react from "file:///home/project/node_modules/@vitejs/plugin-react/dist/index.mjs";
var vite_config_default = defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // React core libraries
          "react-vendor": ["react", "react-dom", "react-router-dom"],
          // UI and animation libraries
          "ui-vendor": ["framer-motion", "lucide-react"],
          // Document parsers - lazy loaded
          "doc-parsers-pdf": ["pdfjs-dist"],
          "doc-parsers-office": ["mammoth", "xlsx"],
          // Editor libraries
          "editor": ["react-quill", "quill"],
          // Charts and visualization
          "charts": ["recharts"],
          // Supabase client
          "supabase": ["@supabase/supabase-js"]
        }
      }
    },
    chunkSizeWarningLimit: 1e3,
    target: "es2020",
    minify: "esbuild"
  },
  optimizeDeps: {
    exclude: [],
    include: ["react", "react-dom", "react-router-dom"]
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvaG9tZS9wcm9qZWN0XCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCIvaG9tZS9wcm9qZWN0L3ZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9ob21lL3Byb2plY3Qvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlJztcbmltcG9ydCByZWFjdCBmcm9tICdAdml0ZWpzL3BsdWdpbi1yZWFjdCc7XG5cbi8vIGh0dHBzOi8vdml0ZWpzLmRldi9jb25maWcvXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoe1xuICBwbHVnaW5zOiBbcmVhY3QoKV0sXG4gIGJ1aWxkOiB7XG4gICAgcm9sbHVwT3B0aW9uczoge1xuICAgICAgb3V0cHV0OiB7XG4gICAgICAgIG1hbnVhbENodW5rczoge1xuICAgICAgICAgIC8vIFJlYWN0IGNvcmUgbGlicmFyaWVzXG4gICAgICAgICAgJ3JlYWN0LXZlbmRvcic6IFsncmVhY3QnLCAncmVhY3QtZG9tJywgJ3JlYWN0LXJvdXRlci1kb20nXSxcbiAgICAgICAgICAvLyBVSSBhbmQgYW5pbWF0aW9uIGxpYnJhcmllc1xuICAgICAgICAgICd1aS12ZW5kb3InOiBbJ2ZyYW1lci1tb3Rpb24nLCAnbHVjaWRlLXJlYWN0J10sXG4gICAgICAgICAgLy8gRG9jdW1lbnQgcGFyc2VycyAtIGxhenkgbG9hZGVkXG4gICAgICAgICAgJ2RvYy1wYXJzZXJzLXBkZic6IFsncGRmanMtZGlzdCddLFxuICAgICAgICAgICdkb2MtcGFyc2Vycy1vZmZpY2UnOiBbJ21hbW1vdGgnLCAneGxzeCddLFxuICAgICAgICAgIC8vIEVkaXRvciBsaWJyYXJpZXNcbiAgICAgICAgICAnZWRpdG9yJzogWydyZWFjdC1xdWlsbCcsICdxdWlsbCddLFxuICAgICAgICAgIC8vIENoYXJ0cyBhbmQgdmlzdWFsaXphdGlvblxuICAgICAgICAgICdjaGFydHMnOiBbJ3JlY2hhcnRzJ10sXG4gICAgICAgICAgLy8gU3VwYWJhc2UgY2xpZW50XG4gICAgICAgICAgJ3N1cGFiYXNlJzogWydAc3VwYWJhc2Uvc3VwYWJhc2UtanMnXVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSxcbiAgICBjaHVua1NpemVXYXJuaW5nTGltaXQ6IDEwMDAsXG4gICAgdGFyZ2V0OiAnZXMyMDIwJyxcbiAgICBtaW5pZnk6ICdlc2J1aWxkJ1xuICB9LFxuICBvcHRpbWl6ZURlcHM6IHtcbiAgICBleGNsdWRlOiBbXSxcbiAgICBpbmNsdWRlOiBbJ3JlYWN0JywgJ3JlYWN0LWRvbScsICdyZWFjdC1yb3V0ZXItZG9tJ11cbiAgfSxcbn0pOyJdLAogICJtYXBwaW5ncyI6ICI7QUFBeU4sU0FBUyxvQkFBb0I7QUFDdFAsT0FBTyxXQUFXO0FBR2xCLElBQU8sc0JBQVEsYUFBYTtBQUFBLEVBQzFCLFNBQVMsQ0FBQyxNQUFNLENBQUM7QUFBQSxFQUNqQixPQUFPO0FBQUEsSUFDTCxlQUFlO0FBQUEsTUFDYixRQUFRO0FBQUEsUUFDTixjQUFjO0FBQUE7QUFBQSxVQUVaLGdCQUFnQixDQUFDLFNBQVMsYUFBYSxrQkFBa0I7QUFBQTtBQUFBLFVBRXpELGFBQWEsQ0FBQyxpQkFBaUIsY0FBYztBQUFBO0FBQUEsVUFFN0MsbUJBQW1CLENBQUMsWUFBWTtBQUFBLFVBQ2hDLHNCQUFzQixDQUFDLFdBQVcsTUFBTTtBQUFBO0FBQUEsVUFFeEMsVUFBVSxDQUFDLGVBQWUsT0FBTztBQUFBO0FBQUEsVUFFakMsVUFBVSxDQUFDLFVBQVU7QUFBQTtBQUFBLFVBRXJCLFlBQVksQ0FBQyx1QkFBdUI7QUFBQSxRQUN0QztBQUFBLE1BQ0Y7QUFBQSxJQUNGO0FBQUEsSUFDQSx1QkFBdUI7QUFBQSxJQUN2QixRQUFRO0FBQUEsSUFDUixRQUFRO0FBQUEsRUFDVjtBQUFBLEVBQ0EsY0FBYztBQUFBLElBQ1osU0FBUyxDQUFDO0FBQUEsSUFDVixTQUFTLENBQUMsU0FBUyxhQUFhLGtCQUFrQjtBQUFBLEVBQ3BEO0FBQ0YsQ0FBQzsiLAogICJuYW1lcyI6IFtdCn0K
