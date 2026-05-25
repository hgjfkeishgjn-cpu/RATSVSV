import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

// 1. Safe environment variable handling: use defaults if they don't exist
const port = Number(process.env.PORT) || 3000;
const basePath = process.env.BASE_PATH || "/";

export default defineConfig({
  base: basePath,
  plugins: [
    react(),
    tailwindcss({ optimize: false }),
    // 2. Only include Replit plugins if NOT in production
    ...(process.env.NODE_ENV !== "production"
      ? [
          // Use dynamic imports to prevent build errors
          import("@replit/vite-plugin-runtime-error-modal").then(m => m.default()),
          import("@replit/vite-plugin-cartographer").then(m => 
            m.cartographer({ root: path.resolve(import.meta.dirname, "..") })
          ),
          import("@replit/vite-plugin-dev-banner").then(m => m.devBanner()),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@assets": path.resolve(import.meta.dirname, "..", "..", "attached_assets"),
    },
    dedupe: ["react", "react-dom"],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: "dist", // Simplified to standard dist
    emptyOutDir: true,
  },
  server: {
    port,
    strictPort: true,
    host: "0.0.0.0",
    allowedHosts: true,
  },
});
