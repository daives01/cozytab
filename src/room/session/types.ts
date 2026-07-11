import type { Id } from "@convex/_generated/dataModel";
import type { RoomItem, Shortcut } from "@shared/guestTypes";

export type RoomSessionKind = "guest-owner" | "authenticated-owner";

export interface ComputerState {
    shortcuts: Shortcut[];
    cursorColor: string | null;
}

export interface ProfileState {
    displayName: string | null;
    onboardingCompleted: boolean;
}

/** Persisted domain data shared by guest and authenticated room owners. */
export interface RoomSessionSnapshot {
    items: RoomItem[];
    inventory: Id<"catalogItems">[];
    coins: number;
    computer: ComputerState;
    profile: ProfileState;
}

/** UI-only state that should never be written by a session adapter. */
export interface RoomEphemeralState {
    mode: "view" | "edit";
    selectedItemId: string | null;
    drawerOpen: boolean;
    draggedItemId: string | null;
    computerOpen: boolean;
    shareModalOpen: boolean;
    musicPlayerItemId: string | null;
    musicInteractionToken: number;
}

/** The target owner-room state shape, independent of its persistence mechanism. */
export interface RoomUiState {
    session: {
        kind: RoomSessionKind;
        loaded: boolean;
    };
    persisted: RoomSessionSnapshot;
    ephemeral: RoomEphemeralState;
}

export interface ProfileChanges {
    displayName?: string;
    onboardingCompleted?: true;
}

export interface RoomSessionAdapter {
    readonly kind: RoomSessionKind;
    load(): RoomSessionSnapshot;
    saveItems(items: RoomItem[]): Promise<void> | void;
    saveComputer(computer: ComputerState): Promise<void> | void;
    saveProfile(profile: ProfileChanges): Promise<void> | void;
}
