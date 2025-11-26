import { useState, useRef, useEffect } from "react";
import type { RoomItem } from "../types";

interface ItemNodeProps {
    item: RoomItem;
    isSelected: boolean;
    mode: "view" | "edit";
    onSelect: () => void;
    onChange: (item: RoomItem) => void;
}

export function ItemNode({ item, isSelected, mode, onSelect, onChange }: ItemNodeProps) {
    const [isDragging, setIsDragging] = useState(false);
    const dragOffset = useRef({ x: 0, y: 0 });

    const handleMouseDown = (e: React.MouseEvent) => {
        if (mode !== "edit") return;
        e.stopPropagation();

        onSelect();
        setIsDragging(true);

        // Calculate offset from mouse to item's current position
        dragOffset.current = {
            x: e.clientX - item.x,
            y: e.clientY - item.y,
        };
    };

    useEffect(() => {
        if (!isDragging) return;

        const handleMouseMove = (e: MouseEvent) => {
            onChange({
                ...item,
                x: e.clientX - dragOffset.current.x,
                y: e.clientY - dragOffset.current.y,
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
    }, [isDragging, item, onChange]);

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
                    window.open(item.url, "_blank");
                }
            }}
        >
            <div
                className="rounded-lg shadow-lg flex items-center justify-center font-bold text-white"
                style={{
                    width: 100,
                    height: 100,
                    backgroundColor: item.url ? "#60a5fa" : "#9ca3af",
                    border: isSelected && mode === "edit" ? "3px solid #3b82f6" : "none",
                }}
            >
                {item.catalogItemId}
            </div>
        </div>
    );
}
