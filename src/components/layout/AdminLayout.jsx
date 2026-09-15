import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { useState } from "react";
import { Outlet, useLocation } from "react-router";

import { Brandmark } from "./Brandmark.jsx";
import { SidebarNav } from "./SidebarNav.jsx";
import { TopBar } from "./TopBar.jsx";

export function AdminLayout() {
  const [navOpen, setNavOpen] = useState(false);
  const location = useLocation();

  return (
    <div className="min-h-dvh bg-ground">
      {/* Fixed sidebar, desktop only. */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col bg-brand-dark lg:flex">
        <Brandmark />
        <SidebarNav />
      </aside>

      {/* Same navigation as a drawer below lg. Radix handles the focus trap,
          escape key and scroll lock that a hand-rolled panel tends to miss. */}
      <Dialog.Root open={navOpen} onOpenChange={setNavOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-ink/40 lg:hidden" />
          <Dialog.Content
            aria-label="Navigation"
            className="fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-brand-dark lg:hidden"
          >
            <Dialog.Title className="sr-only">Navigation</Dialog.Title>
            <Dialog.Description className="sr-only">
              Move to another area of the dashboard.
            </Dialog.Description>

            <div className="flex items-center justify-between pr-2">
              <Brandmark />
              <Dialog.Close
                aria-label="Close navigation"
                className="grid size-9 place-items-center rounded-md text-on-brand/70 hover:bg-white/10 hover:text-on-brand"
              >
                <X size={18} strokeWidth={1.75} aria-hidden="true" />
              </Dialog.Close>
            </div>

            <SidebarNav onNavigate={() => setNavOpen(false)} />
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <div className="lg:pl-64">
        <TopBar onOpenNav={() => setNavOpen(true)} />
        {/* Keyed on pathname so focus and scroll reset between screens. */}
        <Outlet key={location.pathname} />
      </div>
    </div>
  );
}
