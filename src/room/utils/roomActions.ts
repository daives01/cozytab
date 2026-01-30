import { ROOM_ITEM_MAX_X, ROOM_ITEM_MAX_Y } from "@/time/roomConstants";
import type { RoomItem } from "@shared/guestTypes";
import type { Id } from "@convex/_generated/dataModel";
import { createId } from "@/utils/id";

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

export function clampItems(items: RoomItem[]): RoomItem[] {
    return items.map((item) => clampItemPosition(item));
}

export function bringItemToFront(items: RoomItem[], itemId: string) {
    const index = items.findIndex((item) => item.id === itemId);
    if (index === -1 || index === items.length - 1) return items;
    const next = [...items];
    const [item] = next.splice(index, 1);
    next.push(item);
    return next;
}

export function sendItemToBack(items: RoomItem[], itemId: string) {
    const index = items.findIndex((item) => item.id === itemId);
    if (index <= 0) return items;
    const next = [...items];
    const [item] = next.splice(index, 1);
    next.unshift(item);
    return next;
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

export function addDroppedItem(
    items: RoomItem[],
    catalogItemId: Id<"catalogItems">,
    x: number,
    y: number
): RoomItem[] {
    const clampedX = clampCoordinate(x, ROOM_ITEM_MAX_X);
    const clampedY = clampCoordinate(y, ROOM_ITEM_MAX_Y);
    const catalogId = catalogItemId;
    const newItem: RoomItem = {
        id: createId(),
        catalogItemId: catalogId,
        x: clampedX,
        y: clampedY,
        flipped: false,
    };
    return [...items, newItem];
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
