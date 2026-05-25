import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
  plugins: [
    react(), 
    tailwindcss()
  ],
  base: './',
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@workspace/api-client-react": "/workspaces/RATSVSV/lib/api-client-react/src",
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    // Removed 'rollupOptions' entirely. 
    // Let Vite bundle your dependencies properly so they work in the browser.
  },
  server: {
    port: 3000,
    host: "0.0.0.0",
  },
});