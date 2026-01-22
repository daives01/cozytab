import { useRef, type DragEvent } from "react";
import type React from "react";
import { RoomCanvas } from "../RoomCanvas";
import type { TimeOfDay } from "../types";

interface RoomShellProps {
    roomBackgroundImageUrl?: string;
    scale: number;
    timeOfDay: TimeOfDay;
    containerRef?: React.RefObject<HTMLDivElement | null>;
    onMouseMove?: (e: React.MouseEvent) => void;
    onMouseEnter?: (e: React.MouseEvent) => void;
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
    timeOfDay,
    containerRef: externalContainerRef,
    onMouseMove,
    onMouseEnter,
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
        <div className="h-screen w-screen">
            <RoomCanvas
                roomBackgroundImageUrl={roomBackgroundImageUrl}
                scale={scale}
                timeOfDay={timeOfDay}
                containerRef={containerRef}
                onMouseMove={onMouseMove}
                onMouseEnter={onMouseEnter}
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
