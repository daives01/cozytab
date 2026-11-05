import { ROOM_ITEM_MAX_X, ROOM_ITEM_MAX_Y } from "@/time/roomConstants";
import type { RoomItem } from "@shared/guestTypes";

const MIN_POSITION = 0;

function clampCoordinate(value: number, max: number) {
    if (!Number.isFinite(value)) return MIN_POSITION;

    return Math.min(max, Math.max(MIN_POSITION, value));
}

export function clampItemPosition(item: RoomItem): RoomItem {
    return {
        ...item,
        x: clampCoordinate(item.x, ROOM_ITEM_MAX_X),
        y: clampCoordinate(item.y, ROOM_ITEM_MAX_Y),
    };
}

function computePositionAtToggle(item: RoomItem, now: number) {
    return (
        (item.musicPositionAtStart ?? 0) +
        (item.musicPlaying && item.musicStartedAt ? Math.max(0, now - item.musicStartedAt) : 0)
    );
}

export function updateItemsForMusicToggle(items: RoomItem[], itemId: string, playing: boolean, now: number) {
    return items.map((item) => {
        if (item.id !== itemId) return item;

        const positionAtStart = computePositionAtToggle(item, now);

        if (playing) {
            return {
                ...item,
                musicPlaying: true,
                musicStartedAt: now,
                musicPositionAtStart: positionAtStart,
            };
        }

        return {
            ...item,
            musicPlaying: false,
            musicStartedAt: undefined,
            musicPositionAtStart: positionAtStart,
        };
    });
}

export function clampCursorToRoom({
    clientX,
    clientY,
    rect,
    scale,
    roomWidth,
    roomHeight,
    lastPosition,
}: {
    clientX: number;
    clientY: number;
    rect: DOMRect | null | undefined;
    scale: number;
    roomWidth: number;
    roomHeight: number;
    lastPosition: { x: number; y: number };
}) {
    if (rect) {
        const roomX = (clientX - rect.left) / scale;
        const roomY = (clientY - rect.top) / scale;
        const x = Math.max(0, Math.min(roomWidth, roomX));
        const y = Math.max(0, Math.min(roomHeight, roomY));

        return { x, y };
    }

    return lastPosition;
}
