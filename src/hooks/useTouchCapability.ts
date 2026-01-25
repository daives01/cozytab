import { useEffect, useMemo, useState } from "react";

const TOUCH_UA_REGEX =
  /(Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile)/i;

function hasWindow() {
  return typeof window !== "undefined";
}

function hasNavigator() {
  return typeof navigator !== "undefined";
}

function matchMediaQuery(query: string) {
  if (!hasWindow() || typeof window.matchMedia !== "function") return undefined;
  return window.matchMedia(query);
}

export function detectTouchCapable(): boolean {
  if (!hasWindow()) return false;

  const mql = matchMediaQuery("(pointer: coarse)");
  const coarsePointer = Boolean(mql?.matches);

  const hasTouchEvent =
    "ontouchstart" in window ||
    (hasNavigator() && navigator.maxTouchPoints > 0) ||
    (hasNavigator() &&
      "msMaxTouchPoints" in navigator &&
      // Edge/IE specific
      (navigator as Navigator & { msMaxTouchPoints?: number }).msMaxTouchPoints! > 0);

  const uaSuggestsTouch =
    hasNavigator() && TOUCH_UA_REGEX.test(navigator.userAgent);

  return coarsePointer || hasTouchEvent || uaSuggestsTouch;
}

export function useTouchCapability() {
  const initial = useMemo(() => detectTouchCapable(), []);
  const [isTouchCapable, setIsTouchCapable] = useState(initial);

  useEffect(() => {
    if (!hasWindow()) return;

    const update = () => setIsTouchCapable(detectTouchCapable());
    const mql = matchMediaQuery("(pointer: coarse)");

    // Re-evaluate on first touch and pointer capability changes
    window.addEventListener("touchstart", update, { once: true, passive: true });
    if (mql) {
      if (typeof mql.addEventListener === "function") {
        mql.addEventListener("change", update);
      } else if (typeof mql.addListener === "function") {
        mql.addListener(update);
      }
    }

    return () => {
      window.removeEventListener("touchstart", update);
      if (mql) {
        if (typeof mql.removeEventListener === "function") {
          mql.removeEventListener("change", update);
        } else if (typeof mql.removeListener === "function") {
          mql.removeListener(update);
        }
      }
    };
  }, []);

  return isTouchCapable;
}
