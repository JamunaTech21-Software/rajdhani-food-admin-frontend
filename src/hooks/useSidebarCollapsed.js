import { useCallback, useState } from "react";

const KEY = "rajdhani.admin.nav.rail";

function read() {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    // Private windows and blocked site data both throw here.
    return false;
  }
}

/**
 * Whether the sidebar is collapsed to an icon rail.
 *
 * Per-viewer and must survive a reload, so localStorage rather than a server
 * round trip — the same reasoning as the collapsed nav groups it sits beside.
 */
export function useSidebarCollapsed() {
  const [collapsed, setCollapsed] = useState(read);

  const toggle = useCallback(() => {
    setCollapsed((current) => {
      const next = !current;
      try {
        localStorage.setItem(KEY, next ? "1" : "0");
      } catch {
        // Losing the preference is acceptable; breaking the layout is not.
      }
      return next;
    });
  }, []);

  return [collapsed, toggle];
}
