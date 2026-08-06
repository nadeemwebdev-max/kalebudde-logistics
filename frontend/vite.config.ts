import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": { target: "http://localhost:8000", changeOrigin: true },
      "/sitemap.xml": { target: "http://localhost:8000", changeOrigin: true },
      "/robots.txt": { target: "http://localhost:8000", changeOrigin: true },
    },
  },
});
