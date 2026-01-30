import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { ROOM_WIDTH, ROOM_HEIGHT } from "@/time/roomConstants";

const ZOOM_LEVELS = [1, 2, 3] as const;
export type ZoomLevel = (typeof ZOOM_LEVELS)[number];

interface UseMobileZoomOptions {
    initialZoom?: ZoomLevel;
    baseScale: number;
    viewportWidth: number;
    viewportHeight: number;
}

export function useMobileZoom(options: UseMobileZoomOptions) {
    const { initialZoom = 1, baseScale, viewportWidth, viewportHeight } = options;
    const [zoomLevel, setZoomLevel] = useState<ZoomLevel>(initialZoom);
    const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });

    const effectiveScale = baseScale * zoomLevel;
    const isZoomed = zoomLevel > 1;

    const scaledRoomWidth = ROOM_WIDTH * effectiveScale;
    const scaledRoomHeight = ROOM_HEIGHT * effectiveScale;

    const maxPanX = Math.max(0, (scaledRoomWidth - viewportWidth) / 2);
    const maxPanY = Math.max(0, (scaledRoomHeight - viewportHeight) / 2);

    const clampPan = useCallback(
        (x: number, y: number) => ({
            x: Math.max(-maxPanX, Math.min(maxPanX, x)),
            y: Math.max(-maxPanY, Math.min(maxPanY, y)),
        }),
        [maxPanX, maxPanY]
    );

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            setPanOffset((prev) => clampPan(prev.x, prev.y));
        }, 0);
        return () => clearTimeout(timeoutId);
    }, [clampPan]);

    const cycleZoom = useCallback(() => {
        setZoomLevel((prev) => {
            const currentIndex = ZOOM_LEVELS.indexOf(prev);
            const nextIndex = (currentIndex + 1) % ZOOM_LEVELS.length;
            const next = ZOOM_LEVELS[nextIndex];
            if (next === 1) {
                setPanOffset({ x: 0, y: 0 });
            }
            return next;
        });
    }, []);

    const resetZoom = useCallback(() => {
        setZoomLevel(1);
        setPanOffset({ x: 0, y: 0 });
    }, []);

    const zoomLabel = useMemo(() => `${zoomLevel}x`, [zoomLevel]);

    const isPanningRef = useRef(false);
    const lastTouchRef = useRef<{ x: number; y: number } | null>(null);

    const handlePanStart = useCallback((clientX: number, clientY: number) => {
        if (!isZoomed) return;
        isPanningRef.current = true;
        lastTouchRef.current = { x: clientX, y: clientY };
    }, [isZoomed]);

    const handlePanMove = useCallback(
        (clientX: number, clientY: number) => {
            if (!isPanningRef.current || !lastTouchRef.current || !isZoomed) return;

            const dx = clientX - lastTouchRef.current.x;
            const dy = clientY - lastTouchRef.current.y;

            setPanOffset((prev) => clampPan(prev.x + dx, prev.y + dy));
            lastTouchRef.current = { x: clientX, y: clientY };
        },
        [clampPan, isZoomed]
    );

    const handlePanEnd = useCallback(() => {
        isPanningRef.current = false;
        lastTouchRef.current = null;
    }, []);

    return {
        zoomLevel,
        zoomLabel,
        isZoomed,
        panOffset,
        effectiveScale,
        cycleZoom,
        resetZoom,
        setZoomLevel,
        handlePanStart,
        handlePanMove,
        handlePanEnd,
    };
}
