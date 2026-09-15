import { useEffect, useState } from "react";

/**
 * A clock in state, so components can render relative times ("3 hours ago")
 * without reading Date.now() during render — and so those labels re-render as
 * time passes instead of going stale on a page left open.
 */
export function useNow(intervalMs = 60_000) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  return now;
}
