import { useState, useCallback, useEffect, useRef } from "react";
import type { Id } from "@convex/_generated/dataModel";
import type React from "react";

const MOVEMENT_THRESHOLD = 18;

interface TouchPlacementState {
    touchPlacementId: Id<"catalogItems"> | null;
    touchPlacementOrigin: { x: number; y: number } | null;
}

interface Handlers {
    handlePlaceCatalogItem: (catalogItemId: Id<"catalogItems">, clientX: number, clientY: number) => void;
}

interface RoomState {
    mode: "view" | "edit";
}

interface UseTouchPlacementResult extends TouchPlacementState {
    handleTouchPlaceStart: (catalogItemId: Id<"catalogItems">, event: React.PointerEvent) => void;
    handleTouchPlaceRoom: (event: React.PointerEvent) => void;
    onTouchPlacementCancel: () => void;
}

export function useTouchPlacement(
    handlers: Handlers,
    roomState: RoomState
): UseTouchPlacementResult {
    const [touchPlacementId, setTouchPlacementId] = useState<Id<"catalogItems"> | null>(null);
    const [touchPlacementOrigin, setTouchPlacementOrigin] = useState<{ x: number; y: number } | null>(null);
    const touchPlacementPointerIdRef = useRef<number | null>(null);

    const handleTouchPlaceStart = useCallback((catalogItemId: Id<"catalogItems">, event: React.PointerEvent) => {
        if (event.pointerType !== "touch") return;
        event.preventDefault();
        event.stopPropagation();
        setTouchPlacementId(catalogItemId);
        setTouchPlacementOrigin({ x: event.clientX, y: event.clientY });
        touchPlacementPointerIdRef.current = event.pointerId;
    }, []);

    const handleTouchPlaceRoom = useCallback(
        (event: React.PointerEvent) => {
            if (event.pointerType !== "touch") return;
            if (!touchPlacementId) return;
            if (touchPlacementPointerIdRef.current !== null && event.pointerId !== touchPlacementPointerIdRef.current) return;
            event.preventDefault();
            event.stopPropagation();
            handlers.handlePlaceCatalogItem(touchPlacementId, event.clientX, event.clientY);
            setTouchPlacementId(null);
            setTouchPlacementOrigin(null);
            touchPlacementPointerIdRef.current = null;
        },
        [handlers, touchPlacementId]
    );

    const onTouchPlacementCancel = useCallback(() => {
        setTouchPlacementId(null);
        setTouchPlacementOrigin(null);
        touchPlacementPointerIdRef.current = null;
    }, []);

    // Clear placement state when mode changes
    useEffect(() => {
        if (roomState.mode !== "edit") {
            const timeoutId = setTimeout(() => {
                setTouchPlacementId(null);
                setTouchPlacementOrigin(null);
                touchPlacementPointerIdRef.current = null;
            }, 0);
            return () => clearTimeout(timeoutId);
        }
    }, [roomState.mode]);

    // Handle pointer movement threshold to cancel placement on significant movement
    useEffect(() => {
        if (!touchPlacementId || !touchPlacementOrigin) return;

        const handlePointerMove = (event: PointerEvent) => {
            if (event.pointerType !== "touch") return;
            if (
                touchPlacementPointerIdRef.current !== null &&
                event.pointerId !== touchPlacementPointerIdRef.current
            ) {
                return;
            }
            const dx = event.clientX - touchPlacementOrigin.x;
            const dy = event.clientY - touchPlacementOrigin.y;
            if (Math.hypot(dx, dy) > MOVEMENT_THRESHOLD) {
                setTouchPlacementOrigin(null);
                setTouchPlacementId(null);
                touchPlacementPointerIdRef.current = null;
            }
        };

        const handlePointerCancel = (event: PointerEvent) => {
            if (event.pointerType !== "touch") return;
            if (
                touchPlacementPointerIdRef.current !== null &&
                event.pointerId !== touchPlacementPointerIdRef.current
            ) {
                return;
            }
            setTouchPlacementOrigin(null);
            setTouchPlacementId(null);
            touchPlacementPointerIdRef.current = null;
        };

        const handlePointerUp = (event: PointerEvent) => {
            if (event.pointerType !== "touch") return;
            if (
                touchPlacementPointerIdRef.current !== null &&
                event.pointerId !== touchPlacementPointerIdRef.current
            ) {
                return;
            }
            setTouchPlacementOrigin(null);
            touchPlacementPointerIdRef.current = null;
        };

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key !== "Escape") return;
            setTouchPlacementOrigin(null);
            setTouchPlacementId(null);
            touchPlacementPointerIdRef.current = null;
        };

        window.addEventListener("pointermove", handlePointerMove);
        window.addEventListener("pointercancel", handlePointerCancel);
        window.addEventListener("pointerup", handlePointerUp);
        window.addEventListener("keydown", handleKeyDown);

        return () => {
            window.removeEventListener("pointermove", handlePointerMove);
            window.removeEventListener("pointercancel", handlePointerCancel);
            window.removeEventListener("pointerup", handlePointerUp);
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [touchPlacementId, touchPlacementOrigin]);

    return {
        touchPlacementId,
        touchPlacementOrigin,
        handleTouchPlaceStart,
        handleTouchPlaceRoom,
        onTouchPlacementCancel,
    };
}
