import type { Id } from "../convex/_generated/dataModel";

export const GUEST_STARTING_COINS = 5;
export const GUEST_ROOM_STORAGE_KEY = "cozytab_guest_room";
export const GUEST_ONBOARDING_STORAGE_KEY = "cozytab_guest_onboarding_complete";
export const GUEST_COINS_STORAGE_KEY = "cozytab_guest_coins";
export const GUEST_INVENTORY_STORAGE_KEY = "cozytab_guest_inventory";
export const GUEST_SHORTCUTS_STORAGE_KEY = "cozytab_guest_shortcuts";
export const GUEST_CURSOR_COLOR_STORAGE_KEY = "cozytab_guest_cursor_color";
export interface GuestRoomItem {
    id: string;
    catalogItemId: Id<"catalogItems">;
    x: number;
    y: number;
    url?: string;
    flipped?: boolean;
    musicUrl?: string;
    musicType?: "youtube";
    musicPlaying?: boolean;
    musicStartedAt?: number;
    musicPositionAtStart?: number;
}

export interface GuestShortcut {
    id: string;
    name: string;
    url: string;
    row?: number;
    col?: number;
}

export interface GuestSessionState {
    coins: number;
    inventoryIds: Id<"catalogItems">[];
    roomItems: GuestRoomItem[];
    shortcuts: GuestShortcut[];
    onboardingCompleted: boolean;
    cursorColor: string;
}

