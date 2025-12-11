import type React from "react";
import type { CSSProperties, DragEventHandler } from "react";
import { RoomCanvas } from "../RoomCanvas";
import type { TimeOfDay } from "../types";

interface RoomStageProps {
    roomBackgroundImageUrl: string | null | undefined;
    scale: number;
    timeOfDay: TimeOfDay;
    containerRef: React.RefObject<HTMLDivElement | null>;
    roomContent: React.ReactNode;
    overlays: React.ReactNode;
    outerClassName?: string;
    outerStyle?: CSSProperties;
    onBackgroundClick?: () => void;
    onDragOver?: DragEventHandler<HTMLDivElement>;
    onDrop?: DragEventHandler<HTMLDivElement>;
    onMouseMove?: (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => void;
    onMouseEnter?: (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => void;
}

export function RoomStage({
    roomBackgroundImageUrl,
    scale,
    timeOfDay,
    containerRef,
    roomContent,
    overlays,
    outerClassName,
    outerStyle,
    onBackgroundClick,
    onDragOver,
    onDrop,
    onMouseMove,
    onMouseEnter,
}: RoomStageProps) {
    return (
        <RoomCanvas
            roomBackgroundImageUrl={roomBackgroundImageUrl ?? undefined}
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
    );
}
