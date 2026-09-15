import { useEffect, useState } from "react";

/**
 * Counts `seconds` down to zero, restarting whenever a new value arrives.
 *
 * Uses React's "adjust state during render" pattern for the reset rather than
 * an effect: rendering stays pure (no clock read), and the new value is used on
 * the same render instead of after a second pass.
 */
export function useCountdown(seconds = 0) {
  const [startedFrom, setStartedFrom] = useState(seconds);
  const [remaining, setRemaining] = useState(seconds);

  if (seconds !== startedFrom) {
    setStartedFrom(seconds);
    setRemaining(seconds);
  }

  useEffect(() => {
    if (!seconds) return undefined;
    const id = setInterval(() => {
      setRemaining((value) => (value <= 1 ? 0 : value - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [seconds]);

  return remaining;
}

export function formatWait(seconds) {
  if (seconds <= 0) return "a moment";
  if (seconds < 60) return `${seconds} second${seconds === 1 ? "" : "s"}`;
  const minutes = Math.ceil(seconds / 60);
  return `${minutes} minute${minutes === 1 ? "" : "s"}`;
}
