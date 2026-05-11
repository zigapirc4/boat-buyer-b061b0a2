import { useState, useEffect, useCallback, useRef } from "react";

const STORAGE_KEY = "boatbuyer_support_hint_seen";
/** Matches `support-first-visit-hint` animation (1.25s × 3) + buffer. */
const AUTO_DISMISS_MS = Math.ceil(1.25 * 3 * 1000) + 400;

/**
 * One-time subtle emphasis on the Support CTA for first-time visitors (localStorage).
 */
export function useSupportFirstVisitHint() {
  const [showHint, setShowHint] = useState(false);
  const doneRef = useRef(false);

  const acknowledge = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    try {
      window.localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* private mode */
    }
    setShowHint(false);
  }, []);

  useEffect(() => {
    try {
      if (window.localStorage.getItem(STORAGE_KEY)) return;
    } catch {
      return;
    }
    setShowHint(true);
    const t = window.setTimeout(() => acknowledge(), AUTO_DISMISS_MS);
    return () => window.clearTimeout(t);
  }, [acknowledge]);

  return { showHint, acknowledge };
}
