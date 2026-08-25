import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
  },
  envPrefix: ["VITE_", "TAURI_"],
  resolve: {
    alias: {
      "@model-sync/ui/styles.css": path.resolve(__dirname, "../../packages/ui/src/styles.css"),
      "@model-sync/ui": path.resolve(__dirname, "../../packages/ui/src"),
    },
  },
});
