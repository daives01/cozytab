import { Provider as JotaiProvider, useAtomValue, useSetAtom } from "jotai";
import { atom, createStore } from "jotai/vanilla";
import React, { type PropsWithChildren } from "react";
import {
    GUEST_STARTING_COINS,
    type RoomItem,
    type GuestSessionState,
    type GuestShortcut,
    type Shortcut,
} from "@shared/guestTypes";
import {
    readGuestSession,
    saveGuestSession,
    saveRoomItems,
    saveGuestShortcuts,
    markGuestOnboardingComplete as persistGuestOnboarding,
} from "../guestSession";

type Mode = "view" | "edit";

type GuestStore = ReturnType<typeof createStore>;

const startFallback: GuestSessionState = {
    coins: GUEST_STARTING_COINS,
    inventoryIds: [],
    roomItems: [],
    shortcuts: [],
    onboardingCompleted: false,
    cursorColor: "var(--warning)",
};

const baseSessionAtom = atom<GuestSessionState>(startFallback);

const NORMALIZE_COLUMNS = 6;

export const normalizeGuestShortcuts = (shortcuts: GuestShortcut[]): Shortcut[] =>
    shortcuts.map((shortcut, index) => {
        const row =
            typeof shortcut.row === "number" && !Number.isNaN(shortcut.row)
                ? shortcut.row
                : Math.floor(index / NORMALIZE_COLUMNS);
        const col =
            typeof shortcut.col === "number" && !Number.isNaN(shortcut.col)
                ? shortcut.col
                : index % NORMALIZE_COLUMNS;

        return {
            id: shortcut.id,
            name: shortcut.name,
            url: shortcut.url,
            row,
            col,
        };
    });

export const guestCoinsAtom = atom(
    (get) => get(baseSessionAtom).coins,
    (get, set, next: number | ((prev: number) => number)) => {
        const current = get(baseSessionAtom);
        const value = typeof next === "function" ? (next as (p: number) => number)(current.coins) : next;
        const persisted = saveGuestSession({ coins: value });
        set(baseSessionAtom, { ...current, coins: persisted.coins });
    }
);

export const guestInventoryAtom = atom(
    (get) => get(baseSessionAtom).inventoryIds,
    (get, set, updater: (prev: typeof startFallback.inventoryIds) => typeof startFallback.inventoryIds) => {
        const current = get(baseSessionAtom);
        const next = updater(current.inventoryIds);
        const persisted = saveGuestSession({ inventoryIds: next });
        set(baseSessionAtom, { ...current, inventoryIds: persisted.inventoryIds });
    }
);

export const guestRoomItemsAtom = atom(
    (get) => get(baseSessionAtom).roomItems,
    (get, set, next: RoomItem[] | ((prev: RoomItem[]) => RoomItem[])) => {
        const current = get(baseSessionAtom);
        const value = typeof next === "function" ? (next as (p: RoomItem[]) => RoomItem[])(current.roomItems) : next;
        saveRoomItems(value);
        set(baseSessionAtom, { ...current, roomItems: value });
    }
);

export const guestShortcutsAtom = atom(
    (get) => get(baseSessionAtom).shortcuts,
    (get, set, next: GuestShortcut[]) => {
        const current = get(baseSessionAtom);
        saveGuestShortcuts(next);
        set(baseSessionAtom, { ...current, shortcuts: next });
    }
);

export const guestCursorColorAtom = atom(
    (get) => get(baseSessionAtom).cursorColor,
    (get, set, next: string | ((prev: string) => string)) => {
        const current = get(baseSessionAtom);
        const value = typeof next === "function" ? (next as (p: string) => string)(current.cursorColor) : next;
        const persisted = saveGuestSession({ cursorColor: value });
        set(baseSessionAtom, { ...current, cursorColor: persisted.cursorColor });
    }
);

export const guestNormalizedShortcutsAtom = atom((get) =>
    normalizeGuestShortcuts(get(baseSessionAtom).shortcuts)
);

export const guestOnboardingCompletedAtom = atom(
    (get) => get(baseSessionAtom).onboardingCompleted,
    (get, set, completed: boolean) => {
        const current = get(baseSessionAtom);
        if (completed) {
            persistGuestOnboarding();
        }
        set(baseSessionAtom, { ...current, onboardingCompleted: completed });
    }
);

export const guestModeAtom = atom<Mode>("view");
export const guestDrawerOpenAtom = atom(false);
export const guestSelectedItemIdAtom = atom<string | null>(null);
export const guestDraggedItemIdAtom = atom<string | null>(null);
export const guestComputerOpenAtom = atom(false);
export const guestShareModalOpenAtom = atom(false);
export const guestMusicPlayerItemIdAtom = atom<string | null>(null);
export const guestDisplayNameAtom = atom<string | null>(null);

export const guestSessionSnapshotAtom = atom((get): GuestSessionState => {
    const session = get(baseSessionAtom);
    return {
        coins: session.coins,
        inventoryIds: session.inventoryIds,
        roomItems: session.roomItems,
        shortcuts: session.shortcuts,
        onboardingCompleted: session.onboardingCompleted,
        cursorColor: session.cursorColor,
    };
});

export function createGuestStore(initialSession?: GuestSessionState): GuestStore {
    const store = createStore();
    const session = initialSession ?? readGuestSession();
    store.set(baseSessionAtom, session);
    return store;
}

interface GuestStateProviderProps {
    store: GuestStore;
}

export function GuestStateProvider({ store, children }: PropsWithChildren<GuestStateProviderProps>) {
    return React.createElement(JotaiProvider, { store }, children);
}

// Convenience hooks to keep components small
export const useGuestCoins = () => useAtomValue(guestCoinsAtom);
export const useGuestInventory = () => useAtomValue(guestInventoryAtom);
export const useRoomItems = () => useAtomValue(guestRoomItemsAtom);
export const useGuestShortcutsNormalized = () => useAtomValue(guestNormalizedShortcutsAtom);
export const useSetGuestShortcuts = () => useSetAtom(guestShortcutsAtom);
export const useGuestCursorColor = () => useAtomValue(guestCursorColorAtom);
export const useSetGuestCursorColor = () => useSetAtom(guestCursorColorAtom);

