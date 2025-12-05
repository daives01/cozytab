import { useEffect, useState } from "react";

export function useRoomScale(roomWidth: number, roomHeight: number) {
    const [scale, setScale] = useState(1);

    useEffect(() => {
        const handleResize = () => {
            const windowWidth = window.innerWidth;
            const windowHeight = window.innerHeight;

            const scaleX = windowWidth / roomWidth;
            const scaleY = windowHeight / roomHeight;

            const newScale = Math.min(scaleX, scaleY);
            setScale(newScale);
        };

        window.addEventListener("resize", handleResize);
        handleResize();

        return () => window.removeEventListener("resize", handleResize);
    }, [roomWidth, roomHeight]);

    return scale;
}
