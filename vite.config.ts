import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 5173,
    watch: {
      usePolling: true,
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-ui': ['@radix-ui/react-dialog', '@radix-ui/react-select', '@radix-ui/react-tabs'],
          'vendor-query': ['@tanstack/react-query'],
          'vendor-charts': ['recharts'],
          // Feature chunks
          'pages-admin': [
            './src/pages/Departments.tsx',
            './src/pages/Programs.tsx',
            './src/pages/Cohorts.tsx',
            './src/pages/Users.tsx',
          ],
          'pages-analytics': [
            './src/pages/Analytics.tsx',
            './src/pages/COPOAnalytics.tsx',
            './src/pages/Reports.tsx',
          ],
        },
      },
    },
  },
}));

