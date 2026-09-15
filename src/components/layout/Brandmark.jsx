import { useQuery } from "@tanstack/react-query";

import { api } from "../../lib/api.js";

/**
 * Site identity in the sidebar, read from site_profile rather than hardcoded —
 * the same §18.2 rule that governs colour. Unauthenticated, so it also paints
 * before a session is restored.
 */
export function Brandmark() {
  const { data } = useQuery({
    queryKey: ["public", "layout"],
    queryFn: () => api.get("/public/layout", { auth: false }),
    staleTime: 10 * 60_000,
  });

  const site = data?.site;
  const logo = site?.logos?.light ?? site?.logos?.dark;

  return (
    <div className="flex h-14 items-center gap-2.5 px-5">
      {logo?.url ? (
        <img
          src={logo.url}
          alt=""
          width={28}
          height={28}
          className="size-7 shrink-0 rounded object-contain"
        />
      ) : (
        <span className="size-7 shrink-0 rounded bg-white/15" aria-hidden="true" />
      )}

      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold leading-tight text-on-brand">
          {site?.name ?? "Rajdhani"}
        </span>
        <span className="block truncate text-xs leading-tight text-on-brand/60">Admin</span>
      </span>
    </div>
  );
}
