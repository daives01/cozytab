import type React from "react";
import { useEffect, useState } from "react";
import { BASE_TIME_OF_DAY_BACKGROUND, ROOM_HEIGHT, ROOM_WIDTH } from "./roomConstants";

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
    const [skyBackgroundSize, setSkyBackgroundSize] = useState<"cover" | "contain">("cover");

    useEffect(() => {
        const updateBackgroundFit = () => {
            const viewportAspect = window.innerWidth / window.innerHeight;
            const tallThreshold = 1.2; // start easing to contain on portrait-ish screens
            setSkyBackgroundSize(viewportAspect < tallThreshold ? "contain" : "cover");
        };

        updateBackgroundFit();
        window.addEventListener("resize", updateBackgroundFit);
        return () => window.removeEventListener("resize", updateBackgroundFit);
    }, []);

    const outerClass = [
        "relative w-screen h-screen overflow-hidden font-['Patrick_Hand'] bg-black flex items-center justify-center cozy-cursor",
        outerClassName ?? "",
    ]
        .filter(Boolean)
        .join(" ");

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
                    backgroundImage: `url('${BASE_TIME_OF_DAY_BACKGROUND}')`,
                    backgroundSize: skyBackgroundSize,
                    backgroundPosition: "center",
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
                        backgroundColor: backgroundUrl ? "transparent" : "#1a1a1a",
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
