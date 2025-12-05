import type { RoomItem } from "@/types";

export const isMusicItem = (item: RoomItem) => Boolean(item.musicUrl && item.musicType);
