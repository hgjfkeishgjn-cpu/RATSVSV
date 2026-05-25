import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      // Standard path
      "@": path.resolve(import.meta.dirname, "src"),
      
      // Monorepo library path
      "@workspace/api-client-react": "/workspaces/RATSVSV/lib/api-client-react/src",
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      // These are the packages that your library is importing but your app is failing to bundle.
      // This 'external' setting tells the builder to stop trying to compile them and just trust 
      // they exist in your node_modules.
      external: [
        "@tanstack/react-query",
        "zod",
        "axios",
        "react-hook-form",
        "framer-motion"
      ],
    },
  },
  server: {
    port: 3000,
    host: "0.0.0.0",
  },
});