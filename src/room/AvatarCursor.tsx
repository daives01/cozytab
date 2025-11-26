import { Circle } from "react-konva";
import { useEffect, useRef } from "react";
import Konva from "konva";

interface AvatarCursorProps {
    stage: Konva.Stage | null;
}

export function AvatarCursor({ stage }: AvatarCursorProps) {
    const ref = useRef<Konva.Circle>(null);

    useEffect(() => {
        if (!stage) return;

        const handleMouseMove = () => {
            const pos = stage.getPointerPosition();
            if (pos && ref.current) {
                // Simple easing
                const node = ref.current;

                // Instant for now, can add animation frame for smooth lag
                node.x(pos.x);
                node.y(pos.y);
            }
        };

        stage.on("mousemove", handleMouseMove);
        return () => {
            stage.off("mousemove", handleMouseMove);
        };
    }, [stage]);

    return (
        <Circle
            ref={ref}
            radius={10}
            fill="#f43f5e"
            listening={false} // Pass through events
            shadowBlur={5}
            shadowColor="#f43f5e"
        />
    );
}
