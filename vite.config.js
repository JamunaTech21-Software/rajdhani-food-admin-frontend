import { fileURLToPath, URL } from "node:url";

import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [tailwindcss(), react()],
  resolve: {
    alias: {
      "@shared": fileURLToPath(new URL("../shared", import.meta.url)),
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    // The API's CORS allowlist contains http://localhost:5173. Letting Vite
    // drift to the next free port silently breaks every request in the browser,
    // so fail loudly instead.
    port: 5173,
    strictPort: true,
    fs: {
      // ../shared sits outside this app's root
      allow: [fileURLToPath(new URL("..", import.meta.url))],
    },
  },
});
