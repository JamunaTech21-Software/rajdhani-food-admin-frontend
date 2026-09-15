import * as Tooltip from "@radix-ui/react-tooltip";
import { ChevronDown } from "lucide-react";
import { NavLink } from "react-router";

import { useCollapsedGroups } from "../../hooks/useCollapsedGroups.js";
import { cn } from "../../lib/cn.js";
import { useAuthStore } from "../../stores/authStore.js";
import { visibleNavGroups } from "./nav-config.js";

const linkClass = (isActive, collapsed) =>
  cn(
    "flex h-10 items-center rounded-md text-sm transition-colors duration-(--duration-fast)",
    collapsed ? "justify-center px-0" : "gap-2.5 px-3",
    isActive
      ? "bg-surface font-medium text-brand-dark shadow-card"
      : "text-on-brand/80 hover:bg-white/12 hover:text-on-brand",
  );

function NavItem({ to, label, icon: Glyph, end, collapsed, onNavigate }) {
  const link = (
    <NavLink
      to={to}
      end={end}
      onClick={onNavigate}
      title={collapsed ? undefined : label}
      className={({ isActive }) => linkClass(isActive, collapsed)}
    >
      <Glyph size={17} strokeWidth={1.75} aria-hidden="true" className="shrink-0" />
      <span className={cn("truncate", collapsed && "sr-only")}>{label}</span>
    </NavLink>
  );

  // Collapsed, the icon is the only affordance left — the label has to come
  // back on hover and focus or the rail is a guessing game.
  if (!collapsed) return <li>{link}</li>;

  return (
    <li>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>{link}</Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content
            side="right"
            sideOffset={8}
            className="z-50 rounded-md bg-ink px-2.5 py-1.5 text-xs font-medium text-ink-inverse shadow-card"
          >
            {label}
            <Tooltip.Arrow className="fill-ink" />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </li>
  );
}

/**
 * The navigation itself, shared by the fixed desktop sidebar and the mobile
 * drawer so the two can never drift apart.
 *
 * Items are filtered by the §7.3 row the API returned. That is a convenience,
 * not a control: the API checks the same matrix on every request, and
 * RequireCapability renders a 403 for anyone who types a URL directly.
 */
export function SidebarNav({ collapsed = false, onNavigate }) {
  const permissions = useAuthStore((s) => s.admin?.permissions);
  const [collapsedGroups, toggleGroup] = useCollapsedGroups();
  const groups = visibleNavGroups(permissions);

  return (
    <Tooltip.Provider delayDuration={200}>
      {/* The scroll container carries no horizontal padding, so the scrollbar
          sits flush with the panel edge rather than floating inside the nav's
          own inset. The padding moves to the wrapper below it. */}
      <nav
        aria-label="Main"
        className={cn(
          "flex-1 overflow-y-auto overflow-x-hidden overscroll-contain",
          "scrollbar-slim scrollbar-on-brand",
          !collapsed && "scrollbar-gutter-stable",
        )}
      >
        <div className={cn("py-4", collapsed ? "px-2" : "px-3")}>
        {groups.map((group) => {
          // A rail has no room for headings, so groups are always expanded there
          // — otherwise a collapsed group would be unreachable with no way back.
          const isCollapsed = !collapsed && collapsedGroups.has(group.id);
          const listId = `nav-group-${group.id}`;

          return (
            <div key={group.id} className="mb-5 last:mb-0">
              {group.label && !collapsed ? (
                <button
                  type="button"
                  onClick={() => toggleGroup(group.id)}
                  aria-expanded={!isCollapsed}
                  aria-controls={listId}
                  className="flex w-full items-center justify-between rounded-md px-3 pb-2 pt-1 text-eyebrow uppercase text-on-brand/55 hover:text-on-brand/80"
                >
                  {group.label}
                  <ChevronDown
                    size={14}
                    strokeWidth={2}
                    aria-hidden="true"
                    className={cn(
                      "transition-transform duration-(--duration-fast)",
                      isCollapsed && "-rotate-90",
                    )}
                  />
                </button>
              ) : null}

              {/* A hairline instead of a heading, so the rail keeps the grouping. */}
              {group.label && collapsed ? (
                <hr className="mx-2 mb-2 border-white/15" aria-hidden="true" />
              ) : null}

              <ul id={listId} hidden={isCollapsed} className="space-y-0.5">
                {group.items.map((item) => (
                  <NavItem
                    key={item.to}
                    {...item}
                    collapsed={collapsed}
                    onNavigate={onNavigate}
                  />
                ))}
              </ul>
            </div>
          );
        })}
        </div>
      </nav>
    </Tooltip.Provider>
  );
}
