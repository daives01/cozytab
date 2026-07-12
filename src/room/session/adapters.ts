import type { GuestSessionState, RoomItem } from "@shared/guestTypes";
import { readGuestSession, saveGuestSession } from "@/guest/guestSession";
import type { RoomPersistence } from "./types";

export function createGuestRoomPersistence(options: {
    loadSession?: () => GuestSessionState;
    saveSession?: (changes: Partial<GuestSessionState>) => GuestSessionState;
} = {}): RoomPersistence {
    const loadSession = options.loadSession ?? readGuestSession;
    const persistSession = options.saveSession ?? saveGuestSession;
    return {
        load: () => loadSession().roomItems,
        save: async (items) => persistSession({ roomItems: items }).roomItems,
    };
}

export function createAuthenticatedRoomPersistence(options: {
    initialItems: RoomItem[];
    saveItems: (items: RoomItem[]) => Promise<RoomItem[]>;
}): RoomPersistence {
    return {
        load: () => options.initialItems,
        save: options.saveItems,
    };
}
