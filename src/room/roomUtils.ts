import type { RoomItem } from "@shared/guestTypes";

export const isMusicItem = (item: RoomItem) => Boolean(item.musicUrl && item.musicType);
