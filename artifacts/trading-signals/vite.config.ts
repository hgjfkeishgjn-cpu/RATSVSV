import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

// Define the absolute path to the directory containing this config file
const __dirname = import.meta.dirname;

export default defineConfig({
  base: "/",
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      // Standard app path aliases
      "@": path.resolve(__dirname, "src"),
      "@assets": path.resolve(__dirname, "..", "..", "attached_assets"),
      
      // Monorepo alias: ensures Vite looks at the correct folder for your API client
      // Adjust the "../api-client-react/src" if your folder structure differs
      "@workspace/api-client-react": path.resolve(__dirname, "../api-client-react/src"),
    },
    dedupe: ["react", "react-dom"],
  },
  // Ensure the root points to the current directory inside the artifacts folder
  root: __dirname, 
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
  server: {
    port: Number(process.env.PORT) || 3000,
    strictPort: true,
    host: "0.0.0.0",
  },
});
