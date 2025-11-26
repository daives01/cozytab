import { Stage, Layer, Rect, Line, Group } from "react-konva";
import { useEffect, useState, useRef } from "react";
import type { RoomItem } from "../types";
import { ItemNode } from "./ItemNode";
import { AvatarCursor } from "./AvatarCursor";
import Konva from "konva";

interface RoomCanvasProps {
    backgroundTheme: string;
    items: RoomItem[];
    mode: "view" | "edit";
    selectedId: string | null;
    onItemsChange: (items: RoomItem[]) => void;
    onSelectItem: (id: string | null) => void;
}

export function RoomCanvas({
    backgroundTheme,
    items,
    mode,
    selectedId,
    onItemsChange,
    onSelectItem,
}: RoomCanvasProps) {
    const stageRef = useRef<Konva.Stage>(null);
    const [dimensions, setDimensions] = useState({
        width: window.innerWidth,
        height: window.innerHeight,
    });

    useEffect(() => {
        const handleResize = () => {
            setDimensions({
                width: window.innerWidth,
                height: window.innerHeight,
            });
        };
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    const handleDeselect = (e: any) => {
        // deselect when clicked on empty area
        const clickedOnEmpty = e.target === e.target.getStage();
        if (clickedOnEmpty) {
            onSelectItem(null);
        }
    };

    return (
        <Stage
            ref={stageRef}
            width={dimensions.width}
            height={dimensions.height}
            onMouseDown={handleDeselect}
            onTouchStart={handleDeselect}
            className="bg-gray-100"
        >
            <Layer>
                {/* Background */}
                <Rect
                    x={0}
                    y={0}
                    width={dimensions.width}
                    height={dimensions.height}
                    fill={backgroundTheme === "dark" ? "#1a1a1a" : "#f8fafc"}
                />

                {/* Grid pattern for edit mode */}
                {mode === "edit" && (
                    <Group>
                        {Array.from({ length: Math.ceil(dimensions.width / 50) }).map((_, i) => (
                            <Line
                                key={`v-${i}`}
                                points={[i * 50, 0, i * 50, dimensions.height]}
                                stroke="#cbd5e1"
                                strokeWidth={1}
                                dash={[4, 4]}
                            />
                        ))}
                        {Array.from({ length: Math.ceil(dimensions.height / 50) }).map((_, i) => (
                            <Line
                                key={`h-${i}`}
                                points={[0, i * 50, dimensions.width, i * 50]}
                                stroke="#cbd5e1"
                                strokeWidth={1}
                                dash={[4, 4]}
                            />
                        ))}
                    </Group>
                )}

                {items.map((item) => (
                    <ItemNode
                        key={item.id}
                        item={item}
                        isSelected={item.id === selectedId}
                        mode={mode}
                        onSelect={() => onSelectItem(item.id)}
                        onChange={(newItem: RoomItem) => {
                            const newItems = items.map((i) =>
                                i.id === newItem.id ? newItem : i
                            );
                            onItemsChange(newItems);
                        }}
                    />
                ))}

                {/* Cursor on top */}
                <AvatarCursor stage={stageRef.current} />
            </Layer>
        </Stage>
    );
}
