import * as Dialog from "@radix-ui/react-dialog";
import { PanelLeftClose, PanelLeftOpen, X } from "lucide-react";
import { Suspense, useState } from "react";
import { Outlet, useLocation } from "react-router";

import { useSidebarCollapsed } from "../../hooks/useSidebarCollapsed.js";
import { cn } from "../../lib/cn.js";
import { Container } from "../ui/Container.jsx";
import { Skeleton } from "../ui/Skeleton.jsx";
import { Brandmark } from "./Brandmark.jsx";
import { SidebarNav } from "./SidebarNav.jsx";
import { TopBar } from "./TopBar.jsx";

function RouteFallback() {
  return (
    <Container as="div" className="py-8">
      <div role="status" aria-label="Loading page" aria-busy="true">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="mt-6 h-64 w-full" />
      </div>
    </Container>
  );
}

/**
 * The sidebar surface.
 *
 * Every colour is a token, so the gradient follows `primary_color` like the rest
 * of the app — an admin changing the brand colour restyles this too, rather than
 * leaving a hardcoded green panel behind (§6 rule 4, §18.2).
 */
function SidebarSurface({ children, className }) {
  return (
    <div
      className={cn(
        "relative flex flex-col overflow-hidden",
        "bg-linear-to-b from-brand-dark via-brand-dark to-brand-deep",
        className,
      )}
    >
      {/* A warm accent bloom at the top, echoing the gold used throughout the
          brand. Low opacity on purpose: it should read as depth, not decoration. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-64 opacity-[0.12] bg-[radial-gradient(120%_100%_at_50%_0%,var(--color-gold),transparent_70%)]"
      />
      {/* Hairline along the inner edge, to separate the panel from the content. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-0 w-px bg-white/10" />

      <div className="relative flex min-h-0 flex-1 flex-col">{children}</div>
    </div>
  );
}

export function AdminLayout() {
  const [navOpen, setNavOpen] = useState(false);
  const [collapsed, toggleCollapsed] = useSidebarCollapsed();
  const location = useLocation();

  return (
    <div className="min-h-dvh bg-ground">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-20 hidden lg:flex",
          "transition-[width] duration-(--duration-panel) ease-out",
          collapsed ? "w-18" : "w-64",
        )}
      >
        <SidebarSurface className="w-full">
          <Brandmark collapsed={collapsed} />
          <SidebarNav collapsed={collapsed} />

          <div className={cn("border-t border-white/10 p-2", collapsed && "px-2")}>
            <button
              type="button"
              onClick={toggleCollapsed}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              aria-expanded={!collapsed}
              className={cn(
                "flex h-9 w-full items-center rounded-md text-sm text-on-brand/70",
                "transition-colors duration-(--duration-fast) hover:bg-white/12 hover:text-on-brand",
                collapsed ? "justify-center px-0" : "gap-2.5 px-3",
              )}
            >
              {collapsed ? (
                <PanelLeftOpen size={17} strokeWidth={1.75} aria-hidden="true" />
              ) : (
                <PanelLeftClose size={17} strokeWidth={1.75} aria-hidden="true" />
              )}
              <span className={cn(collapsed && "sr-only")}>Collapse</span>
            </button>
          </div>
        </SidebarSurface>
      </aside>

      {/* Same navigation as a drawer below lg. Radix handles the focus trap,
          escape key and scroll lock that a hand-rolled panel tends to miss.
          The drawer is never railed — on a phone there is room for labels. */}
      <Dialog.Root open={navOpen} onOpenChange={setNavOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-ink/40 lg:hidden" />
          <Dialog.Content
            aria-label="Navigation"
            className="fixed inset-y-0 left-0 z-50 w-64 lg:hidden"
          >
            <Dialog.Title className="sr-only">Navigation</Dialog.Title>
            <Dialog.Description className="sr-only">
              Move to another area of the dashboard.
            </Dialog.Description>

            <SidebarSurface className="h-full w-full">
              <div className="flex items-center justify-between pr-2">
                <Brandmark />
                <Dialog.Close
                  aria-label="Close navigation"
                  className="grid size-9 place-items-center rounded-md text-on-brand/70 hover:bg-white/12 hover:text-on-brand"
                >
                  <X size={18} strokeWidth={1.75} aria-hidden="true" />
                </Dialog.Close>
              </div>

              <SidebarNav onNavigate={() => setNavOpen(false)} />
            </SidebarSurface>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <div
        className={cn(
          "transition-[padding] duration-(--duration-panel) ease-out",
          collapsed ? "lg:pl-18" : "lg:pl-64",
        )}
      >
        <TopBar onOpenNav={() => setNavOpen(true)} />
        {/* Shared boundary for the route-split module screens. Keyed on
            pathname so focus and scroll reset between them. */}
        <Suspense fallback={<RouteFallback />}>
          <Outlet key={location.pathname} />
        </Suspense>
      </div>
    </div>
  );
}
