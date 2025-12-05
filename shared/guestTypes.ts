export const GUEST_STARTING_COINS = 5;
export const GUEST_ROOM_STORAGE_KEY = "cozytab_guest_room";
export const GUEST_ONBOARDING_STORAGE_KEY = "cozytab_guest_onboarding_complete";
export const GUEST_COINS_STORAGE_KEY = "cozytab_guest_coins";
export const GUEST_INVENTORY_STORAGE_KEY = "cozytab_guest_inventory";
export const GUEST_SHORTCUTS_STORAGE_KEY = "cozytab_guest_shortcuts";
export const STARTER_COMPUTER_NAME = "Basic Computer";

export type GuestShortcutType = "user" | "system";

export interface GuestRoomItem {
    id: string;
    catalogItemId: string;
    x: number;
    y: number;
    url?: string;
    flipped?: boolean;
    musicUrl?: string;
    musicType?: "youtube" | "spotify";
    musicPlaying?: boolean;
    musicStartedAt?: number;
    musicPositionAtStart?: number;
    scaleX?: number;
    scaleY?: number;
    rotation?: number;
    zIndex?: number;
}

export interface GuestShortcut {
    id: string;
    name: string;
    url: string;
    row?: number;
    col?: number;
    type?: GuestShortcutType;
}

export interface GuestSessionState {
    coins: number;
    inventoryIds: string[];
    roomItems: GuestRoomItem[];
    shortcuts: GuestShortcut[];
    onboardingCompleted: boolean;
}

