import type { GuestSessionState, RoomItem } from "@shared/guestTypes";
import { readGuestSession, saveGuestSession } from "@/guest/guestSession";
import { createRoomDraft } from "./roomDraft";
import type { RoomPersistence } from "./types";

export function createGuestRoomPersistence(options: {
    loadSession?: () => GuestSessionState;
    saveSession?: (changes: Partial<GuestSessionState>) => GuestSessionState;
} = {}): RoomPersistence {
    const loadSession = options.loadSession ?? readGuestSession;
    const persistSession = options.saveSession ?? saveGuestSession;
    let checkpoint: RoomItem[] | null = null;
    let canonicalCheckpoint: RoomItem[] = [];
    return {
        load: () => loadSession().roomItems,
        draft: {
            load: () => null,
            // Guest progress must be current even if the tab closes or sign-in
            // reads it before the structural-save debounce has elapsed.
            write: (items) => {
                canonicalCheckpoint = persistSession({ roomItems: items }).roomItems;
                checkpoint = items;
            },
            acknowledge: () => {},
        },
        // The synchronous checkpoint already saved these items. In particular,
        // cleanup after Guest Conversion must not recreate cleared progress.
        save: async (items) => items === checkpoint
            ? canonicalCheckpoint
            : persistSession({ roomItems: items }).roomItems,
    };
}

export function createAuthenticatedRoomPersistence(options: {
    roomId?: string;
    initialItems: RoomItem[];
    saveItems: (items: RoomItem[]) => Promise<RoomItem[]>;
}): RoomPersistence {
    return {
        draft: options.roomId ? createRoomDraft(options.roomId) : undefined,
        load: () => options.initialItems,
        save: options.saveItems,
    };
}
