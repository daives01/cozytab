import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { CursorAvatar } from "@/components/CursorAvatar";
import { useTouchOnly } from "@/hooks/useTouchCapability";

interface TouchCursorProps {
    cursorColor?: string;
}

const POINTER_HOTSPOT = { x: 6, y: 3 };
const POINTER_SIZE = { width: 38, height: 48 };

export function TouchCursor({ cursorColor = "var(--chart-4)" }: TouchCursorProps) {
    const isTouchOnly = useTouchOnly();
    const [position, setPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
    const [hasTouch, setHasTouch] = useState(false);
    const rafIdRef = useRef<number | null>(null);
    const pendingPositionRef = useRef<{ x: number; y: number } | null>(null);
    const activeTouchIdRef = useRef<number | null>(null);

    const handleTouch = useCallback((e: TouchEvent) => {
        const touch =
            activeTouchIdRef.current === null
                ? e.touches[0]
                : Array.from(e.touches).find((item) => item.identifier === activeTouchIdRef.current);
        if (!touch) return;

        if (activeTouchIdRef.current === null) {
            activeTouchIdRef.current = touch.identifier;
        }

        pendingPositionRef.current = { x: touch.clientX, y: touch.clientY };
        if (!hasTouch) {
            setHasTouch(true);
        }

        if (rafIdRef.current === null) {
            rafIdRef.current = requestAnimationFrame(() => {
                if (pendingPositionRef.current !== null) {
                    setPosition(pendingPositionRef.current);
                }
                rafIdRef.current = null;
            });
        }
    }, [hasTouch]);

    const handleTouchEnd = useCallback((e: TouchEvent) => {
        if (activeTouchIdRef.current === null) return;
        const stillActive = Array.from(e.touches).some((item) => item.identifier === activeTouchIdRef.current);
        if (!stillActive) {
            activeTouchIdRef.current = null;
            pendingPositionRef.current = null;
        }
    }, []);

    useEffect(() => {
        if (!isTouchOnly) return;

        window.addEventListener("touchstart", handleTouch, { passive: true });
        window.addEventListener("touchmove", handleTouch, { passive: true });
        window.addEventListener("touchend", handleTouchEnd, { passive: true });
        window.addEventListener("touchcancel", handleTouchEnd, { passive: true });

        return () => {
            window.removeEventListener("touchstart", handleTouch);
            window.removeEventListener("touchmove", handleTouch);
            window.removeEventListener("touchend", handleTouchEnd);
            window.removeEventListener("touchcancel", handleTouchEnd);

            if (rafIdRef.current !== null) {
                cancelAnimationFrame(rafIdRef.current);
                rafIdRef.current = null;
            }
            activeTouchIdRef.current = null;
        };
    }, [isTouchOnly, handleTouch, handleTouchEnd]);

    if (!isTouchOnly || !hasTouch) {
        return null;
    }

    return createPortal(
        <div
            className="fixed pointer-events-none z-[100]"
            style={{
                left: position.x - POINTER_HOTSPOT.x,
                top: position.y - POINTER_HOTSPOT.y,
            }}
        >
            <CursorAvatar
                color={cursorColor}
                width={POINTER_SIZE.width}
                height={POINTER_SIZE.height}
            />
        </div>,
        document.body
    );
}
