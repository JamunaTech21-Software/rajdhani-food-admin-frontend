import { ChevronDown } from "lucide-react";
import { NavLink } from "react-router";

import { useCollapsedGroups } from "../../hooks/useCollapsedGroups.js";
import { cn } from "../../lib/cn.js";
import { useAuthStore } from "../../stores/authStore.js";
import { visibleNavGroups } from "./nav-config.js";

const linkClass = ({ isActive }) =>
  cn(
    "flex h-10 items-center gap-2.5 rounded-md px-3 text-sm transition-colors duration-(--duration-fast)",
    isActive
      ? "bg-surface font-medium text-brand-dark"
      : "text-on-brand/80 hover:bg-white/10 hover:text-on-brand",
  );

function NavItem({ to, label, icon: Glyph, end, onNavigate }) {
  return (
    <li>
      <NavLink to={to} end={end} onClick={onNavigate} className={linkClass}>
        <Glyph size={17} strokeWidth={1.75} aria-hidden="true" className="shrink-0" />
        <span className="truncate">{label}</span>
      </NavLink>
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
export function SidebarNav({ onNavigate }) {
  const permissions = useAuthStore((s) => s.admin?.permissions);
  const [collapsed, toggleGroup] = useCollapsedGroups();
  const groups = visibleNavGroups(permissions);

  return (
    <nav aria-label="Main" className="flex-1 overflow-y-auto px-3 py-4">
      {groups.map((group) => {
        const isCollapsed = collapsed.has(group.id);
        const listId = `nav-group-${group.id}`;

        return (
          <div key={group.id} className="mb-5 last:mb-0">
            {group.label ? (
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

            <ul id={listId} hidden={isCollapsed} className="space-y-0.5">
              {group.items.map((item) => (
                <NavItem key={item.to} {...item} onNavigate={onNavigate} />
              ))}
            </ul>
          </div>
        );
      })}
    </nav>
  );
}
