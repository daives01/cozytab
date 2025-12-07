import type React from "react";
import type { CSSProperties, DragEvent } from "react";
import { RoomStage } from "./components/RoomStage";

interface RoomShellProps {
    backgroundUrl: string | null | undefined;
    scale: number;
    timeOfDay: "day" | "night";
    containerRef: React.RefObject<HTMLDivElement | null>;
    outerClassName?: string;
    outerStyle?: CSSProperties;
    roomContent: React.ReactNode;
    overlays?: React.ReactNode;
    onDragOver?: (event: DragEvent) => void;
    onDrop?: (event: DragEvent) => void;
    onMouseMove?: (event: React.MouseEvent) => void;
    onMouseEnter?: (event: React.MouseEvent) => void;
    onBackgroundClick?: () => void;
}

export function RoomShell({
    backgroundUrl,
    scale,
    timeOfDay,
    containerRef,
    outerClassName,
    outerStyle,
    roomContent,
    overlays,
    onDragOver,
    onDrop,
    onMouseMove,
    onMouseEnter,
    onBackgroundClick,
}: RoomShellProps) {
    return (
        <div className="h-screen w-screen">
            <RoomStage
                backgroundUrl={backgroundUrl}
                scale={scale}
                timeOfDay={timeOfDay}
                containerRef={containerRef}
                onDragOver={onDragOver}
                onDrop={onDrop}
                onMouseMove={onMouseMove}
                onMouseEnter={onMouseEnter}
                onBackgroundClick={onBackgroundClick}
                outerClassName={outerClassName}
                outerStyle={outerStyle}
                roomContent={roomContent}
                overlays={overlays}
            />
        </div>
    );
}

