import { useCallback, useState } from "react";

const KEY = "rajdhani.admin.nav.collapsed";

function read() {
  try {
    const raw = localStorage.getItem(KEY);
    return Array.isArray(JSON.parse(raw)) ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    // Private windows, blocked site data and thumbnail capture all throw here.
    return new Set();
  }
}

/**
 * Which sidebar groups an admin has collapsed.
 *
 * localStorage is the right home for this and not a server capability: it is a
 * per-viewer convenience, it must survive a reload, and nothing else needs to
 * read it. Every access is guarded because storage can be unavailable.
 */
export function useCollapsedGroups() {
  const [collapsed, setCollapsed] = useState(read);

  const toggle = useCallback((id) => {
    setCollapsed((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);

      try {
        localStorage.setItem(KEY, JSON.stringify([...next]));
      } catch {
        // Losing the preference is acceptable; breaking the nav is not.
      }
      return next;
    });
  }, []);

  return [collapsed, toggle];
}
