import { useQuery } from "@tanstack/react-query";

import { api } from "../../lib/api.js";
import { cn } from "../../lib/cn.js";

/**
 * Site identity in the sidebar, read from site_profile rather than hardcoded —
 * the same §18.2 rule that governs colour. Unauthenticated, so it also paints
 * before a session is restored.
 */
export function Brandmark({ collapsed = false }) {
  const { data } = useQuery({
    queryKey: ["public", "layout"],
    queryFn: () => api.get("/public/layout", { auth: false }),
    staleTime: 10 * 60_000,
  });

  const site = data?.site;
  const logo = site?.logos?.light ?? site?.logos?.dark;

  return (
    <div className={cn("flex h-14 items-center gap-2.5", collapsed ? "justify-center px-0" : "px-5")}>
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

      {/* Hidden rather than unmounted, so the width transition has something to
          slide against instead of the text reflowing mid-animation. */}
      <span
        className={cn(
          "min-w-0 overflow-hidden transition-all duration-(--duration-panel)",
          collapsed ? "w-0 opacity-0" : "w-auto opacity-100",
        )}
        aria-hidden={collapsed}
      >
        <span className="block truncate text-sm font-semibold leading-tight text-on-brand">
          {site?.name ?? "Rajdhani"}
        </span>
        <span className="block truncate text-xs leading-tight text-on-brand/60">Admin</span>
      </span>
    </div>
  );
}
