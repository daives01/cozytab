import { useState, useCallback, useEffect } from "react";
import type { Id } from "@convex/_generated/dataModel";
import type React from "react";
import type { RoomEditingSession } from "../session";

const MOVEMENT_THRESHOLD = 18;

interface Handlers {
    handlePlaceCatalogItem: (catalogItemId: Id<"catalogItems">, clientX: number, clientY: number) => void;
}

interface RoomState {
    mode: "view" | "edit";
    touchPlacementId: Id<"catalogItems"> | null;
    editingSession: Pick<RoomEditingSession, "beginPlacement" | "cancelPlacement">;
}

interface UseTouchPlacementResult {
    touchPlacementId: Id<"catalogItems"> | null;
    handleTouchPlaceStart: (catalogItemId: Id<"catalogItems">, event: React.PointerEvent) => void;
    handleTouchPlaceRoom: (event: React.PointerEvent) => void;
    onTouchPlacementCancel: () => void;
}

export function useTouchPlacement(handlers: Handlers, roomState: RoomState): UseTouchPlacementResult {
    const touchPlacementId = roomState.touchPlacementId;
    const [gesture, setGesture] = useState<{ x: number; y: number; pointerId: number } | null>(null);

    const handleTouchPlaceStart = useCallback(
        (catalogItemId: Id<"catalogItems">, event: React.PointerEvent) => {
            if (event.pointerType !== "touch") return;
            event.preventDefault();
            event.stopPropagation();

            if (!roomState.editingSession.beginPlacement(catalogItemId).accepted) return;
            setGesture({ x: event.clientX, y: event.clientY, pointerId: event.pointerId });
        },
        [roomState.editingSession],
    );

    const handleTouchPlaceRoom = useCallback(
        (event: React.PointerEvent) => {
            if (event.pointerType !== "touch") return;

            if (!touchPlacementId) return;

            if (gesture !== null && event.pointerId !== gesture.pointerId) return;
            event.preventDefault();
            event.stopPropagation();
            handlers.handlePlaceCatalogItem(touchPlacementId, event.clientX, event.clientY);
            roomState.editingSession.cancelPlacement();
            setGesture(null);
        },
        [gesture, handlers, roomState.editingSession, touchPlacementId],
    );

    const onTouchPlacementCancel = useCallback(() => {
        roomState.editingSession.cancelPlacement();
        setGesture(null);
    }, [roomState.editingSession]);

    // Clear placement state when mode changes
    useEffect(() => {
        if (roomState.mode !== "edit") {
            const timeoutId = setTimeout(() => {
                roomState.editingSession.cancelPlacement();
                setGesture(null);
            }, 0);

            return () => clearTimeout(timeoutId);
        }
    }, [roomState.editingSession, roomState.mode]);

    // Handle pointer movement threshold to cancel placement on significant movement
    useEffect(() => {
        if (!touchPlacementId || !gesture) return;

        const handlePointerMove = (event: PointerEvent) => {
            if (event.pointerType !== "touch") return;

            if (event.pointerId !== gesture.pointerId) {
                return;
            }

            const dx = event.clientX - gesture.x;
            const dy = event.clientY - gesture.y;

            if (Math.hypot(dx, dy) > MOVEMENT_THRESHOLD) {
                setGesture(null);
                roomState.editingSession.cancelPlacement();
            }
        };

        const handlePointerEnd = (event: PointerEvent) => {
            if (event.pointerType !== "touch" || event.pointerId !== gesture.pointerId) return;
            setGesture(null);

            if (event.type === "pointercancel") roomState.editingSession.cancelPlacement();
        };

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key !== "Escape") return;
            setGesture(null);
            roomState.editingSession.cancelPlacement();
        };

        window.addEventListener("pointermove", handlePointerMove);
        window.addEventListener("pointercancel", handlePointerEnd);
        window.addEventListener("pointerup", handlePointerEnd);
        window.addEventListener("keydown", handleKeyDown);

        return () => {
            window.removeEventListener("pointermove", handlePointerMove);
            window.removeEventListener("pointercancel", handlePointerEnd);
            window.removeEventListener("pointerup", handlePointerEnd);
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [roomState.editingSession, touchPlacementId, gesture]);

    return {
        touchPlacementId,
        handleTouchPlaceStart,
        handleTouchPlaceRoom,
        onTouchPlacementCancel,
    };
}
