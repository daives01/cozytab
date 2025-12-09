import type { RoomItem } from "../../types";
import type { Id } from "../../../convex/_generated/dataModel";

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
    const catalogId = catalogItemId;
    const newItem: RoomItem = {
        id: crypto.randomUUID(),
        catalogItemId: catalogId,
        x,
        y,
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

