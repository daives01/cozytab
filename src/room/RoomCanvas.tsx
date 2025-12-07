import { useMemo } from "react";
import type React from "react";
import { ROOM_HEIGHT, ROOM_WIDTH, getLocalTimeOfDayBackground } from "./roomConstants";

interface RoomCanvasProps {
    backgroundUrl?: string;
    scale: number;
    containerRef?: React.Ref<HTMLDivElement>;
    onMouseMove?: React.MouseEventHandler<HTMLDivElement>;
    onMouseEnter?: React.MouseEventHandler<HTMLDivElement>;
    onDragOver?: React.DragEventHandler<HTMLDivElement>;
    onDrop?: React.DragEventHandler<HTMLDivElement>;
    onBackgroundClick?: () => void;
    outerClassName?: string;
    roomContent: React.ReactNode;
    overlays?: React.ReactNode;
}

export function RoomCanvas({
    backgroundUrl,
    scale,
    containerRef,
    onMouseMove,
    onMouseEnter,
    onDragOver,
    onDrop,
    onBackgroundClick,
    outerClassName,
    roomContent,
    overlays,
}: RoomCanvasProps) {
    const outerClass = [
        "relative w-screen h-screen overflow-hidden font-['Patrick_Hand'] bg-black cozy-cursor flex items-center justify-center",
        outerClassName ?? "",
    ]
        .filter(Boolean)
        .join(" ");

    const baseBackground = useMemo(() => getLocalTimeOfDayBackground(), []);

    return (
        <div
            className={outerClass}
            onMouseMove={onMouseMove}
            onMouseEnter={onMouseEnter}
            onDragOver={onDragOver}
            onDrop={onDrop}
        >
            <div
                className="absolute inset-0 pointer-events-none"
                style={{
                    backgroundImage: `url('${baseBackground}')`,
                    backgroundSize: "cover",
                    backgroundPosition: "center center",
                    backgroundRepeat: "no-repeat",
                    zIndex: 0,
                    filter: "brightness(1) saturate(1)",
                    transition: "filter 600ms ease, opacity 600ms ease",
                }}
            />
            <div
                ref={containerRef}
                style={{
                    width: ROOM_WIDTH,
                    height: ROOM_HEIGHT,
                    transform: `scale(${scale})`,
                    transformOrigin: "center",
                    position: "relative",
                    flexShrink: 0,
                    zIndex: 1,
                }}
            >
                <div
                    className="absolute inset-0"
                    style={{
                        backgroundImage: backgroundUrl ? `url('${backgroundUrl}')` : undefined,
                        backgroundSize: "contain",
                        backgroundPosition: "center",
                        backgroundRepeat: "no-repeat",
                        backgroundColor: backgroundUrl ? "transparent" : "var(--paper)",
                        zIndex: 0,
                    }}
                    onClick={onBackgroundClick}
                />

                {roomContent}
            </div>

            {overlays}
        </div>
    );
}
