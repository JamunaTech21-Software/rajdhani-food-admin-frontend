import { useEffect } from "react";
import { useBlocker } from "react-router";

/**
 * Guards a dirty form against losing work two different ways (§18.3).
 *
 * `useBlocker` catches in-app navigation — a sidebar link, the back button.
 * `beforeunload` catches leaving the site entirely: a closed tab or a typed
 * URL never reaches the router, so the blocker alone would miss it.
 */
export function useUnsavedGuard(isDirty) {
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      isDirty && currentLocation.pathname !== nextLocation.pathname,
  );

  useEffect(() => {
    if (!isDirty) return undefined;

    const warn = (event) => {
      event.preventDefault();
      // Browsers ignore custom text now and show their own wording.
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [isDirty]);

  return blocker;
}
