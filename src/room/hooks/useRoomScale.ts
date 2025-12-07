import { useEffect, useState } from "react";

interface RoomScaleOptions {
    viewportWidth?: number;
    viewportHeight?: number;
    insetX?: number;
    insetY?: number;
    maxScale?: number;
}

export function useRoomScale(roomWidth: number, roomHeight: number, options?: RoomScaleOptions) {
    const [scale, setScale] = useState(1);

    const { viewportWidth, viewportHeight, insetX = 0, insetY = 0, maxScale } = options ?? {};

    useEffect(() => {
        const handleResize = () => {
            const availableWidth = Math.max((viewportWidth ?? window.innerWidth) - insetX, 1);
            const availableHeight = Math.max((viewportHeight ?? window.innerHeight) - insetY, 1);

            const scaleX = availableWidth / roomWidth;
            const scaleY = availableHeight / roomHeight;

            let nextScale = Math.min(scaleX, scaleY);

            if (maxScale !== undefined) {
                nextScale = Math.min(nextScale, maxScale);
            }

            setScale(nextScale);
        };

        window.addEventListener("resize", handleResize);
        handleResize();

        return () => window.removeEventListener("resize", handleResize);
    }, [insetX, insetY, maxScale, roomHeight, roomWidth, viewportHeight, viewportWidth]);

    return scale;
}
