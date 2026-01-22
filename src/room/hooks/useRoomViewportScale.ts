import { useRoomScale } from "./useRoomScale";
import { useViewportSize } from "./useRoomPageEffects";
import { ROOM_HEIGHT, ROOM_WIDTH } from "@/time/roomConstants";

const DEFAULT_MAX_SCALE = 1.25;

interface UseRoomViewportScaleOptions {
    maxScale?: number;
}

export function useRoomViewportScale(options?: UseRoomViewportScaleOptions) {
    const { maxScale = DEFAULT_MAX_SCALE } = options ?? {};
    const { width: viewportWidth, height: viewportHeight } = useViewportSize();
    const scale = useRoomScale(ROOM_WIDTH, ROOM_HEIGHT, {
        viewportWidth,
        viewportHeight,
        maxScale,
    });

    return { viewportWidth, viewportHeight, scale };
}
