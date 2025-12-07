import { useMemo } from "react";
import type React from "react";
import { ROOM_HEIGHT, ROOM_WIDTH, BASE_BACKGROUND_DAY, BASE_BACKGROUND_NIGHT, type TimeOfDay } from "./roomConstants";

interface RoomCanvasProps {
    backgroundUrl?: string;
    scale: number;
    timeOfDay: TimeOfDay;
    containerRef?: React.Ref<HTMLDivElement>;
    onMouseMove?: React.MouseEventHandler<HTMLDivElement>;
    onMouseEnter?: React.MouseEventHandler<HTMLDivElement>;
    onDragOver?: React.DragEventHandler<HTMLDivElement>;
    onDrop?: React.DragEventHandler<HTMLDivElement>;
    onBackgroundClick?: () => void;
    outerClassName?: string;
    outerStyle?: React.CSSProperties;
    roomContent: React.ReactNode;
    overlays?: React.ReactNode;
}

export function RoomCanvas({
    backgroundUrl,
    scale,
    timeOfDay,
    containerRef,
    onMouseMove,
    onMouseEnter,
    onDragOver,
    onDrop,
    onBackgroundClick,
    outerClassName,
    outerStyle,
    roomContent,
    overlays,
}: RoomCanvasProps) {
    const outerClass = [
        "relative w-full h-full overflow-hidden font-['Patrick_Hand'] cozy-cursor flex items-center justify-center",
        outerClassName ?? "",
    ]
        .filter(Boolean)
        .join(" ");

    const isNight = timeOfDay === "night";

    const baseBackground = useMemo(
        () => (timeOfDay === "day" ? BASE_BACKGROUND_DAY : BASE_BACKGROUND_NIGHT),
        [timeOfDay]
    );

    const baseFilter = "brightness(1) saturate(1)";
    const candleTint =
        "radial-gradient(circle at 18% 20%, rgba(255, 201, 150, 0.08), transparent 40%), radial-gradient(circle at 78% 12%, rgba(255, 186, 120, 0.08), transparent 36%), linear-gradient(180deg, rgba(26, 20, 12, 0.08), rgba(10, 6, 2, 0.14))";
    const backgroundGradient = "linear-gradient(180deg, #f9f4ea 0%, #f5ede0 45%, #f2e9da 100%)";

    return (
        <div
            className={outerClass}
            onMouseMove={onMouseMove}
            onMouseEnter={onMouseEnter}
            onDragOver={onDragOver}
            onDrop={onDrop}
            style={{
                background: backgroundGradient,
                transition: "background 400ms ease",
                ...outerStyle,
            }}
        >
            <div
                className="absolute inset-0 pointer-events-none"
                style={{
                    backgroundImage: `url('${baseBackground}')`,
                    backgroundSize: "cover",
                    backgroundPosition: "center center",
                    backgroundRepeat: "no-repeat",
                    zIndex: 0,
                    filter: baseFilter,
                    transition: "filter 600ms ease, opacity 600ms ease",
                }}
            />
            {isNight && (
                <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                        zIndex: 0,
                        background: candleTint,
                        mixBlendMode: "soft-light",
                        transition: "opacity 600ms ease",
                    }}
                />
            )}
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
