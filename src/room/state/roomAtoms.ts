import { Provider as JotaiProvider } from "jotai";
import { selectAtom } from "jotai/utils";
import type { Getter, Setter } from "jotai/vanilla";
import { atom, createStore } from "jotai/vanilla";
import React, { type PropsWithChildren, useMemo } from "react";
import type { ComputerShortcut, RoomItem } from "../../types";
import type { Id } from "../../../convex/_generated/dataModel";

export type Mode = "view" | "edit";
export type MusicAutoplayState = { itemId: string; token: string } | null;

type RoomUiState = {
    mode: Mode;
    items: RoomItem[];
    selectedId: string | null;
    drawerOpen: boolean;
    draggedItemId: string | null;
    computerOpen: boolean;
    shareModalOpen: boolean;
    shortcuts: ComputerShortcut[];
    cursorColor: string | null;
    musicPlayerItemId: string | null;
    musicAutoplay: MusicAutoplayState;
    displayName: string | null;
    onboardingCompleted: boolean;
    coins: number;
    inventory: Id<"catalogItems">[];
    sessionLoaded: boolean;
};

const defaultState: RoomUiState = {
    mode: "view",
    items: [],
    selectedId: null,
    drawerOpen: false,
    draggedItemId: null,
    computerOpen: false,
    shareModalOpen: false,
    shortcuts: [],
    cursorColor: null,
    musicPlayerItemId: null,
    musicAutoplay: null,
    displayName: null,
    onboardingCompleted: false,
    coins: 0,
    inventory: [],
    sessionLoaded: false,
};

const roomStateAtom = atom<RoomUiState>(defaultState);

const patchState = (get: Getter, set: Setter, patch: Partial<RoomUiState>) =>
    set(roomStateAtom, { ...get(roomStateAtom), ...patch });

export const modeAtom = atom(
    (get) => get(roomStateAtom).mode,
    (get, set, next: Mode | ((prev: Mode) => Mode)) => {
        const current = get(roomStateAtom).mode;
        patchState(get, set, { mode: typeof next === "function" ? (next as (p: Mode) => Mode)(current) : next });
    }
);

export const itemsAtom = atom(
    (get) => get(roomStateAtom).items,
    (get, set, next: RoomItem[] | ((prev: RoomItem[]) => RoomItem[])) => {
        const current = get(roomStateAtom).items;
        patchState(get, set, { items: typeof next === "function" ? (next as (p: RoomItem[]) => RoomItem[])(current) : next });
    }
);

export const selectedIdAtom = atom(
    (get) => get(roomStateAtom).selectedId,
    (get, set, next: string | null | ((prev: string | null) => string | null)) => {
        const current = get(roomStateAtom).selectedId;
        patchState(get, set, {
            selectedId: typeof next === "function" ? (next as (p: string | null) => string | null)(current) : next,
        });
    }
);

export const drawerOpenAtom = atom(
    (get) => get(roomStateAtom).drawerOpen,
    (get, set, next: boolean | ((prev: boolean) => boolean)) => {
        const current = get(roomStateAtom).drawerOpen;
        patchState(get, set, { drawerOpen: typeof next === "function" ? (next as (p: boolean) => boolean)(current) : next });
    }
);

export const draggedItemIdAtom = atom(
    (get) => get(roomStateAtom).draggedItemId,
    (get, set, next: string | null | ((prev: string | null) => string | null)) => {
        const current = get(roomStateAtom).draggedItemId;
        patchState(get, set, {
            draggedItemId: typeof next === "function" ? (next as (p: string | null) => string | null)(current) : next,
        });
    }
);

export const computerOpenAtom = atom(
    (get) => get(roomStateAtom).computerOpen,
    (get, set, next: boolean | ((prev: boolean) => boolean)) => {
        const current = get(roomStateAtom).computerOpen;
        patchState(get, set, { computerOpen: typeof next === "function" ? (next as (p: boolean) => boolean)(current) : next });
    }
);

export const shareModalOpenAtom = atom(
    (get) => get(roomStateAtom).shareModalOpen,
    (get, set, next: boolean | ((prev: boolean) => boolean)) => {
        const current = get(roomStateAtom).shareModalOpen;
        patchState(get, set, {
            shareModalOpen: typeof next === "function" ? (next as (p: boolean) => boolean)(current) : next,
        });
    }
);

export const shortcutsAtom = atom(
    (get) => get(roomStateAtom).shortcuts,
    (get, set, next: ComputerShortcut[] | ((prev: ComputerShortcut[]) => ComputerShortcut[])) => {
        const current = get(roomStateAtom).shortcuts;
        patchState(get, set, {
            shortcuts: typeof next === "function" ? (next as (p: ComputerShortcut[]) => ComputerShortcut[])(current) : next,
        });
    }
);

export const cursorColorAtom = atom(
    (get) => get(roomStateAtom).cursorColor,
    (get, set, next: string | null | ((prev: string | null) => string | null)) => {
        const current = get(roomStateAtom).cursorColor;
        patchState(get, set, {
            cursorColor: typeof next === "function" ? (next as (p: string | null) => string | null)(current) : next,
        });
    }
);

export const musicPlayerItemIdAtom = atom(
    (get) => get(roomStateAtom).musicPlayerItemId,
    (get, set, next: string | null | ((prev: string | null) => string | null)) => {
        const current = get(roomStateAtom).musicPlayerItemId;
        patchState(get, set, {
            musicPlayerItemId: typeof next === "function" ? (next as (p: string | null) => string | null)(current) : next,
        });
    }
);

export const musicAutoplayAtom = atom(
    (get) => get(roomStateAtom).musicAutoplay,
    (get, set, next: MusicAutoplayState | ((prev: MusicAutoplayState) => MusicAutoplayState)) => {
        const current = get(roomStateAtom).musicAutoplay;
        patchState(get, set, {
            musicAutoplay: typeof next === "function" ? (next as (p: MusicAutoplayState) => MusicAutoplayState)(current) : next,
        });
    }
);

export const displayNameAtom = atom(
    (get) => get(roomStateAtom).displayName,
    (get, set, next: string | null | ((prev: string | null) => string | null)) => {
        const current = get(roomStateAtom).displayName;
        patchState(get, set, {
            displayName: typeof next === "function" ? (next as (p: string | null) => string | null)(current) : next,
        });
    }
);

export const onboardingCompletedAtom = atom(
    (get) => get(roomStateAtom).onboardingCompleted,
    (get, set, next: boolean | ((prev: boolean) => boolean)) => {
        const current = get(roomStateAtom).onboardingCompleted;
        patchState(get, set, {
            onboardingCompleted: typeof next === "function" ? (next as (p: boolean) => boolean)(current) : next,
        });
    }
);

export const coinsAtom = atom(
    (get) => get(roomStateAtom).coins,
    (get, set, next: number | ((prev: number) => number)) => {
        const current = get(roomStateAtom).coins;
        patchState(get, set, { coins: typeof next === "function" ? (next as (p: number) => number)(current) : next });
    }
);

export const inventoryAtom = atom(
    (get) => get(roomStateAtom).inventory,
    (get, set, updater: (prev: Id<"catalogItems">[]) => Id<"catalogItems">[]) => {
        const current = get(roomStateAtom).inventory;
        patchState(get, set, { inventory: updater(current) });
    }
);

export const sessionLoadedAtom = atom(
    (get) => get(roomStateAtom).sessionLoaded,
    (get, set, next: boolean) => {
        patchState(get, set, { sessionLoaded: next });
    }
);

export const roomStateSnapshotAtom = atom((get) => get(roomStateAtom));

export const resetRoomStateAtom = atom(null, (get, set, initialState?: Partial<RoomUiState>) => {
    patchState(get, set, { ...defaultState, ...initialState });
});

// Narrow selectors to avoid broad re-renders in consumers
export const selectedItemAtom = selectAtom(
    roomStateAtom,
    (state) => state.items.find((item) => item.id === state.selectedId) ?? null,
    (a, b) => a?.id === b?.id && a === b
);

export const makeItemSelectorAtom = (id: string) =>
    selectAtom(
        itemsAtom,
        (items) => items.find((item) => item.id === id) ?? null,
        (a, b) => a?.id === b?.id && a === b
    );

export const createRoomStore = (initialState?: Partial<RoomUiState>) => {
    const store = createStore();
    store.set(roomStateAtom, { ...defaultState, ...initialState });
    return store;
};

interface RoomStateProviderProps {
    initialState?: Partial<RoomUiState>;
    storeKey?: string | number;
}

export function RoomStateProvider({ initialState, storeKey, children }: PropsWithChildren<RoomStateProviderProps>) {
    const store = useMemo(() => {
        // storeKey intentionally participates in memoization to allow distinct scoped stores
        void storeKey;
        return createRoomStore(initialState);
    }, [storeKey, initialState]);
    return React.createElement(JotaiProvider, { store }, children);
}

