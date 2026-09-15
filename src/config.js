export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") ?? "http://localhost:8000/api/v1";

/** Public customer site, for the "View on site" links on published content (§11). */
export const SITE_URL =
  import.meta.env.VITE_SITE_URL?.replace(/\/$/, "") ?? "https://rajdhanifood.com";
