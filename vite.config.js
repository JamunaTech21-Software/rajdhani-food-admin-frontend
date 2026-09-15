import { fileURLToPath, URL } from "node:url";

import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, loadEnv } from "vite";

/**
 * The API origin, under whichever name the deployment was able to set it.
 *
 * Vite only auto-exposes `VITE_`-prefixed variables to the browser, but that is
 * a rule about *exposure*, not about what the build can see: the host hands
 * every project variable to the build as an ordinary `process.env` entry
 * whatever it is called. So the name in the Vercel dashboard is free, and the
 * build resolves it here to the one variable the client code reads.
 *
 * Order is most-specific first. `VITE_API_BASE_URL` stays supported so an
 * existing deployment keeps working while the dashboard is renamed.
 */
const API_URL_NAMES = ["VITE_BASE_URL", "VITE_API_BASE_URL", "API_BASE_URL", "BASE_URL"];
const SITE_URL_NAMES = ["VITE_SITE_URL", "SITE_URL"];

function resolve(env, names) {
  for (const name of names) {
    const value = env[name]?.trim();
    if (value) return { name, value };
  }
  return null;
}

/**
 * `undefined` rather than `""` when nothing is set, so `config.js`'s `??`
 * fallback to localhost still fires — an empty string is not nullish and would
 * silently point every request at this origin.
 */
const literal = (found) => (found ? JSON.stringify(found.value) : "undefined");

export default defineConfig(({ mode }) => {
  // The "" prefix loads every variable, not just VITE_ ones, so an unprefixed
  // name is visible here. Only the two values picked below are ever injected
  // into the bundle — nothing else from this object may be, since it now holds
  // whatever else the build environment happens to carry.
  const env = { ...process.env, ...loadEnv(mode, process.cwd(), "") };

  const api = resolve(env, API_URL_NAMES);
  const site = resolve(env, SITE_URL_NAMES);

  // Say which name was used. The failure this guards against is silent: a
  // misspelled variable builds cleanly and 404s on every request at runtime.
  console.log(
    api
      ? `[env] API base URL from ${api.name}=${api.value}`
      : `[env] no API base URL set (tried ${API_URL_NAMES.join(", ")}) — falling back to localhost`,
  );

  return {
    plugins: [tailwindcss(), react()],
    define: {
      // config.js reads these two names only; everything above is just how the
      // deployment happened to spell them.
      "import.meta.env.VITE_BASE_URL": literal(api),
      "import.meta.env.VITE_SITE_URL": literal(site),
    },
    resolve: {
      alias: {
        // Inside src/ so this repo is self-contained and can build on its own —
        // Vercel's build root is this directory, with no parent to reach into.
        "@shared": fileURLToPath(new URL("./src/shared", import.meta.url)),
        "@": fileURLToPath(new URL("./src", import.meta.url)),
      },
    },
    server: {
      // 5174, not 5173. The API reserves 5173 for the customer site (SITE_URL)
      // and 5174 for this dashboard (ADMIN_URL) — and ADMIN_URL is what builds
      // the invite and password-reset links it emails. On 5173 those links
      // point at a port this app is not serving, and the invite flow dead-ends.
      // Both origins are on the CORS allowlist, so only the link target moves.
      //
      // strictPort because drifting to the next free port puts the app on an
      // origin CORS refuses, which breaks every request with no obvious cause.
      port: 5174,
      strictPort: true,
    },
  };
});
