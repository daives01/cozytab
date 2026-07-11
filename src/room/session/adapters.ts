import type { GuestSessionState, RoomItem } from "@shared/guestTypes";
import { normalizeGuestShortcuts, readGuestSession, saveGuestSession } from "@/guest/guestSession";
import type {
    ComputerState,
    ProfileChanges,
    RoomSessionAdapter,
    RoomSessionSnapshot,
} from "./types";

type PersistenceOperation = () => Promise<unknown> | unknown;

function guestSnapshot(session: GuestSessionState): RoomSessionSnapshot {
    return {
        items: session.roomItems,
        inventory: session.inventoryIds,
        coins: session.coins,
        computer: {
            shortcuts: normalizeGuestShortcuts(session.shortcuts),
            cursorColor: session.cursorColor,
        },
        profile: {
            displayName: null,
            onboardingCompleted: session.onboardingCompleted,
        },
    };
}

export interface GuestRoomSessionAdapterOptions {
    loadSession?: () => GuestSessionState;
    saveSession?: (changes: Partial<GuestSessionState>) => GuestSessionState;
}

export function createGuestRoomSessionAdapter(
    options: GuestRoomSessionAdapterOptions = {}
): RoomSessionAdapter {
    const loadSession = options.loadSession ?? (() => readGuestSession());
    const persistSession = options.saveSession ?? saveGuestSession;

    return {
        kind: "guest-owner",
        load: () => guestSnapshot(loadSession()),
        saveItems: (items) => {
            persistSession({ roomItems: items });
        },
        saveComputer: (computer) => {
            persistSession({
                shortcuts: computer.shortcuts,
                cursorColor: computer.cursorColor ?? loadSession().cursorColor,
            });
        },
        saveProfile: (profile) => {
            if (profile.onboardingCompleted) {
                persistSession({ onboardingCompleted: true });
            }
            // Guest display names are intentionally session-local in the legacy flow.
        },
    };
}

export interface AuthenticatedRoomSessionAdapterOptions {
    loadSnapshot: () => RoomSessionSnapshot;
    saveItems: (items: RoomItem[]) => Promise<unknown> | unknown;
    saveComputer: (computer: ComputerState) => Promise<unknown> | unknown;
    saveDisplayName: (displayName: string) => Promise<unknown> | unknown;
    completeOnboarding: PersistenceOperation;
}

export function createAuthenticatedRoomSessionAdapter(
    options: AuthenticatedRoomSessionAdapterOptions
): RoomSessionAdapter {
    return {
        kind: "authenticated-owner",
        load: options.loadSnapshot,
        saveItems: async (items) => {
            await options.saveItems(items);
        },
        saveComputer: async (computer) => {
            await options.saveComputer(computer);
        },
        saveProfile: async (profile: ProfileChanges) => {
            const operations: (Promise<unknown> | unknown)[] = [];
            if (profile.displayName !== undefined) {
                operations.push(options.saveDisplayName(profile.displayName));
            }
            if (profile.onboardingCompleted) {
                operations.push(options.completeOnboarding());
            }
            await Promise.all(operations);
        },
    };
}
