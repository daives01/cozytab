import { useCallback, type RefObject } from "react";

export function useVisitorCursorTracking({
    containerRef,
    scale,
    updateCursor,
}: {
    containerRef: RefObject<HTMLDivElement | null>;
    scale: number;
    updateCursor: (roomX: number, roomY: number, clientX: number, clientY: number) => void;
}) {
    const updateCursorFromClient = useCallback(
        (clientX: number, clientY: number) => {
            if (!containerRef.current) return;
            const rect = containerRef.current.getBoundingClientRect();
            const roomX = (clientX - rect.left) / scale;
            const roomY = (clientY - rect.top) / scale;
            updateCursor(roomX, roomY, clientX, clientY);
        },
        [containerRef, scale, updateCursor]
    );

    const handleMouseEvent = useCallback(
        (e: React.MouseEvent) => {
            updateCursorFromClient(e.clientX, e.clientY);
        },
        [updateCursorFromClient]
    );

    const handlePointerEvent = useCallback(
        (e: React.PointerEvent) => {
            if (e.pointerType !== "touch") return;
            updateCursorFromClient(e.clientX, e.clientY);
        },
        [updateCursorFromClient]
    );

    return {
        updateCursorFromClient,
        handleMouseEvent,
        handlePointerEvent,
    };
}
