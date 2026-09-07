import { fileURLToPath, URL } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("/node_modules/@noble/") || id.includes("/node_modules/@scure/")) {
            return "crypto";
          }
          if (id.includes("/node_modules/viem/")) return "viem";
          if (id.includes("/node_modules/genlayer-js/")) return "genlayer";
          if (id.includes("/node_modules/@tanstack/")) return "query";
          if (
            id.includes("/node_modules/react/") ||
            id.includes("/node_modules/react-dom/") ||
            id.includes("/node_modules/react-router/") ||
            id.includes("/node_modules/react-router-dom/")
          ) {
            return "react";
          }
        },
      },
    },
  },
});
