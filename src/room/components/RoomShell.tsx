import { useRef, type DragEvent } from "react";
import type React from "react";
import { RoomCanvas } from "../RoomCanvas";
import type { TimeOfDay } from "../types";

interface RoomShellProps {
    roomBackgroundImageUrl?: string;
    scale: number;
    zoomLevel?: number;
    panOffset?: { x: number; y: number };
    timeOfDay: TimeOfDay;
    containerRef?: React.RefObject<HTMLDivElement | null>;
    onMouseMove?: (e: React.MouseEvent) => void;
    onMouseEnter?: (e: React.MouseEvent) => void;
    onPointerMove?: (e: React.PointerEvent) => void;
    onPointerEnter?: (e: React.PointerEvent) => void;
    onPointerDown?: (e: React.PointerEvent) => void;
    onPointerUp?: (e: React.PointerEvent) => void;
    onPointerCancel?: (e: React.PointerEvent) => void;
    onDrop?: (e: DragEvent) => void;
    onDragOver?: (e: DragEvent) => void;
    onBackgroundClick?: () => void;
    outerClassName?: string;
    outerStyle?: React.CSSProperties;
    roomContent: React.ReactNode;
    overlays: React.ReactNode;
}

export function RoomShell({
    roomBackgroundImageUrl,
    scale,
    zoomLevel,
    panOffset,
    timeOfDay,
    containerRef: externalContainerRef,
    onMouseMove,
    onMouseEnter,
    onPointerMove,
    onPointerEnter,
    onPointerDown,
    onPointerUp,
    onPointerCancel,
    onDrop,
    onDragOver,
    onBackgroundClick,
    outerClassName,
    outerStyle,
    roomContent,
    overlays,
}: RoomShellProps) {
    const internalContainerRef = useRef<HTMLDivElement | null>(null);
    const containerRef = externalContainerRef ?? internalContainerRef;

    return (
        <div className="fixed inset-0 overflow-hidden overscroll-none">
            <RoomCanvas
                roomBackgroundImageUrl={roomBackgroundImageUrl}
                scale={scale}
                zoomLevel={zoomLevel}
                panOffset={panOffset}
                timeOfDay={timeOfDay}
                containerRef={containerRef}
                onMouseMove={onMouseMove}
                onMouseEnter={onMouseEnter}
                onPointerMove={onPointerMove}
                onPointerEnter={onPointerEnter}
                onPointerDown={onPointerDown}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerCancel}
                onDrop={onDrop}
                onDragOver={onDragOver}
                onBackgroundClick={onBackgroundClick}
                outerClassName={outerClassName}
                outerStyle={outerStyle}
                roomContent={roomContent}
                overlays={overlays}
            />
        </div>
    );
}
