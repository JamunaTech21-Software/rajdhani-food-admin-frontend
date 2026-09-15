import { fileURLToPath, URL } from "node:url";

import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [tailwindcss(), react()],
  resolve: {
    alias: {
      // Inside src/ so this repo is self-contained and can build on its own —
      // Vercel's build root is this directory, with no parent to reach into.
      "@shared": fileURLToPath(new URL("./src/shared", import.meta.url)),
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    // The API's CORS allowlist contains http://localhost:5173. Letting Vite
    // drift to the next free port silently breaks every request in the browser,
    // so fail loudly instead.
    port: 5173,
    strictPort: true,
  },
});
