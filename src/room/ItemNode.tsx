import { useState, useRef, useEffect } from "react";
import type { RoomItem } from "../types";

interface ItemNodeProps {
    item: RoomItem;
    isSelected: boolean;
    mode: "view" | "edit";
    scale: number;
    onSelect: () => void;
    onChange: (item: RoomItem) => void;
}

export function ItemNode({ item, isSelected, mode, scale, onSelect, onChange }: ItemNodeProps) {
    const [isDragging, setIsDragging] = useState(false);
    const dragStart = useRef({ x: 0, y: 0 });
    const itemStart = useRef({ x: 0, y: 0 });

    const handleMouseDown = (e: React.MouseEvent) => {
        if (mode !== "edit") return;
        e.stopPropagation();

        onSelect();
        setIsDragging(true);

        // Store initial mouse position and item position
        dragStart.current = { x: e.clientX, y: e.clientY };
        itemStart.current = { x: item.x, y: item.y };
    };

    useEffect(() => {
        if (!isDragging) return;

        const handleMouseMove = (e: MouseEvent) => {
            // Calculate delta in screen coordinates
            const dx = e.clientX - dragStart.current.x;
            const dy = e.clientY - dragStart.current.y;

            // Apply scale to delta to get room coordinates
            onChange({
                ...item,
                x: itemStart.current.x + dx / scale,
                y: itemStart.current.y + dy / scale,
            });
        };

        const handleMouseUp = () => {
            setIsDragging(false);
        };

        window.addEventListener("mousemove", handleMouseMove);
        window.addEventListener("mouseup", handleMouseUp);

        return () => {
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("mouseup", handleMouseUp);
        };
    }, [isDragging, item, onChange, scale]);

    return (
        <div
            className="absolute"
            style={{
                left: item.x,
                top: item.y,
                transform: "translate(-50%, -50%)",
                zIndex: 10,
                cursor: mode === "edit" ? "move" : "pointer",
            }}
            onMouseDown={handleMouseDown}
            onClick={(e) => {
                e.stopPropagation();
                if (mode === "view" && item.url) {
                    // window.open(item.url, "_blank");
                }
            }}
        >
            <div
                className="relative group"
                style={{
                    width: 150, // Default width, maybe make this dynamic later
                    // height: 100, // Let height be auto to maintain aspect ratio
                }}
            >
                <img
                    src={item.url}
                    alt="Room Item"
                    className="w-full h-auto object-contain select-none pointer-events-none drop-shadow-md"
                    style={{
                        filter: isSelected && mode === "edit" ? "drop-shadow(0 0 4px #3b82f6)" : "none",
                    }}
                />

                {/* Selection Border/Overlay */}
                {isSelected && mode === "edit" && (
                    <div className="absolute inset-0 border-2 border-primary rounded-md pointer-events-none" />
                )}
            </div>
        </div>
    );
}
