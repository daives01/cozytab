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

/** Returns true if the device is primarily touch-based (no fine pointer available) */
export function isTouchOnlyDevice(): boolean {
  if (!hasWindow()) return false;
  const coarse = matchMediaQuery("(pointer: coarse)");
  const fine = matchMediaQuery("(pointer: fine)");
  return Boolean(coarse?.matches) && !fine?.matches;
}

function useMediaQueryState(detector: () => boolean): boolean {
  const initial = useMemo(() => detector(), [detector]);
  const [state, setState] = useState(initial);

  useEffect(() => {
    if (!hasWindow()) return;

    const update = () => setState(detector());
    const mql = matchMediaQuery("(pointer: coarse)");

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
  }, [detector]);

  return state;
}

export function useTouchCapability(): boolean {
  return useMediaQueryState(detectTouchCapable);
}

/** React hook that returns true if device is touch-only (no mouse) */
export function useTouchOnly(): boolean {
  return useMediaQueryState(isTouchOnlyDevice);
}
