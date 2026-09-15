import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { ChevronDown, LogOut, Menu } from "lucide-react";

import { useConfirm } from "../ui/confirm-context.js";
import { useToast } from "../ui/toast-context.js";
import { logout } from "../../lib/api.js";
import { useAuthStore } from "../../stores/authStore.js";

const ROLE_LABEL = {
  SUPER_ADMIN: "Super Admin",
  EDITOR: "Editor",
  SALES: "Sales",
};

const initials = (name) =>
  (name ?? "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "?";

export function TopBar({ onOpenNav }) {
  const admin = useAuthStore((s) => s.admin);
  const confirm = useConfirm();
  const toast = useToast();

  async function handleSignOut() {
    const confirmed = await confirm({
      title: "Sign out?",
      description: "You will need your password to sign back in.",
      confirmLabel: "Sign out",
      tone: "danger",
    });
    if (!confirmed) return;

    await logout();
    toast.success("Signed out");
  }

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-line bg-surface px-4 sm:px-6">
      <button
        type="button"
        onClick={onOpenNav}
        aria-label="Open navigation"
        className="-ml-1 grid size-9 place-items-center rounded-md text-ink-muted hover:bg-ground hover:text-ink lg:hidden"
      >
        <Menu size={20} strokeWidth={1.75} aria-hidden="true" />
      </button>

      <div className="flex-1" />

      <DropdownMenu.Root>
        <DropdownMenu.Trigger className="flex items-center gap-2 rounded-md py-1 pl-1 pr-2 text-left hover:bg-ground data-[state=open]:bg-ground">
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-brand-tint text-xs font-semibold text-brand">
            {initials(admin?.name)}
          </span>
          <span className="hidden min-w-0 sm:block">
            <span className="block truncate text-sm font-medium leading-tight text-ink">
              {admin?.name ?? "Signed in"}
            </span>
            <span className="block truncate text-xs leading-tight text-ink-muted">
              {ROLE_LABEL[admin?.role] ?? admin?.role}
            </span>
          </span>
          <ChevronDown size={15} strokeWidth={2} aria-hidden="true" className="text-ink-subtle" />
        </DropdownMenu.Trigger>

        <DropdownMenu.Portal>
          <DropdownMenu.Content
            align="end"
            sideOffset={6}
            className="z-50 w-60 rounded-md border border-line bg-surface p-1 shadow-card"
          >
            <div className="px-3 py-2">
              <p className="truncate text-sm font-medium text-ink">{admin?.name}</p>
              <p className="truncate text-xs text-ink-muted">{admin?.email}</p>
            </div>

            <DropdownMenu.Separator className="my-1 h-px bg-line" />

            <DropdownMenu.Item
              onSelect={handleSignOut}
              className="flex cursor-pointer items-center gap-2 rounded-sm px-3 py-2 text-sm text-ink outline-none data-[highlighted]:bg-danger-tint data-[highlighted]:text-danger"
            >
              <LogOut size={15} strokeWidth={1.75} aria-hidden="true" />
              Sign out
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </header>
  );
}
