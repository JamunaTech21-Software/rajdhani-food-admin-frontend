// Not `BASE_URL`: Vite already defines `import.meta.env.BASE_URL` as the app's
// public base path ("/"). Reusing that name would read the built-in instead, and
// every request would silently resolve against this origin rather than the API.
export const API_BASE_URL =
  import.meta.env.VITE_BASE_URL?.replace(/\/$/, "") ?? "http://localhost:8000/api/v1";

/** Public customer site, for the "View on site" links on published content (§11). */
export const SITE_URL =
  import.meta.env.VITE_SITE_URL?.replace(/\/$/, "") ?? "https://rajdhanifood.com";
