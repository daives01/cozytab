import { useRef, useEffect } from "react";
import { Rect, Transformer, Group, Text } from "react-konva";
import type { RoomItem } from "../types";

interface ItemNodeProps {
    item: RoomItem;
    isSelected: boolean;
    mode: "view" | "edit";
    onSelect: () => void;
    onChange: (item: RoomItem) => void;
}

export function ItemNode({
    item,
    isSelected,
    mode,
    onSelect,
    onChange,
}: ItemNodeProps) {
    const shapeRef = useRef<any>(null);
    const trRef = useRef<any>(null);

    useEffect(() => {
        if (isSelected && mode === "edit") {
            // we need to attach transformer manually
            trRef.current.nodes([shapeRef.current]);
            trRef.current.getLayer().batchDraw();
        }
    }, [isSelected, mode]);

    const handleClick = () => {
        if (mode === "edit") {
            onSelect();
        } else if (item.url) {
            window.open(item.url, "_blank");
        }
    };

    return (
        <>
            <Group
                id={item.id}
                x={item.x}
                y={item.y}
                rotation={item.rotation}
                scaleX={item.scaleX}
                scaleY={item.scaleY}
                draggable={mode === "edit"}
                onClick={handleClick}
                onTap={handleClick}
                onDragEnd={(e) => {
                    onChange({
                        ...item,
                        x: e.target.x(),
                        y: e.target.y(),
                    });
                }}
                onTransformEnd={() => {
                    // transformer is changing scale and rotation
                    const node = shapeRef.current;
                    const scaleX = node.scaleX();
                    const scaleY = node.scaleY();

                    // we will reset it back
                    node.scaleX(1);
                    node.scaleY(1);

                    onChange({
                        ...item,
                        x: node.x(),
                        y: node.y(),
                        // set minimal value
                        scaleX: Math.max(0.1, scaleX),
                        scaleY: Math.max(0.1, scaleY),
                        rotation: node.rotation(),
                    });
                }}
                ref={shapeRef}
            >
                {/* Placeholder for item content */}
                <Rect
                    width={100}
                    height={100}
                    fill={item.url ? "#60a5fa" : "#9ca3af"}
                    cornerRadius={8}
                    shadowBlur={5}
                    shadowColor="black"
                    shadowOpacity={0.2}
                />
                <Text
                    text={item.catalogItemId}
                    width={100}
                    align="center"
                    y={40}
                    fill="white"
                    fontStyle="bold"
                />
            </Group>
            {isSelected && mode === "edit" && (
                <Transformer
                    ref={trRef}
                    boundBoxFunc={(oldBox, newBox) => {
                        // limit resize
                        if (newBox.width < 5 || newBox.height < 5) {
                            return oldBox;
                        }
                        return newBox;
                    }}
                />
            )}
        </>
    );
}
