import type { Doc, Id } from "@convex/_generated/dataModel";

export const GUEST_STARTING_COINS = 5;
export const GUEST_ROOM_STORAGE_KEY = "cozytab_guest_room";
export const GUEST_ONBOARDING_STORAGE_KEY = "cozytab_guest_onboarding_complete";
export const GUEST_COINS_STORAGE_KEY = "cozytab_guest_coins";
export const GUEST_INVENTORY_STORAGE_KEY = "cozytab_guest_inventory";
export const GUEST_SHORTCUTS_STORAGE_KEY = "cozytab_guest_shortcuts";
export const GUEST_CURSOR_COLOR_STORAGE_KEY = "cozytab_guest_cursor_color";

/** Room item type derived from Convex schema */
export type RoomItem = Doc<"rooms">["items"][number];

/** Shortcut type derived from Convex schema */
type UserComputer = NonNullable<Doc<"users">["computer"]>;
export type Shortcut = UserComputer["shortcuts"][number];

/**
 * Shortcut stored in guest localStorage — row/col may be missing for legacy data.
 * Use `normalizeGuestShortcuts` to convert to full `Shortcut` before use.
 */
export type GuestShortcut = Omit<Shortcut, "row" | "col"> & { row?: number; col?: number };

export interface GuestSessionState {
    coins: number;
    inventoryIds: Id<"catalogItems">[];
    roomItems: RoomItem[];
    shortcuts: GuestShortcut[];
    onboardingCompleted: boolean;
    cursorColor: string;
}

