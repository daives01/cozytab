import { useCallback, useEffect, useMemo, useRef } from "react";
import type { Doc, Id } from "@convex/_generated/dataModel";
import type { GuestSessionState, RoomItem, Shortcut } from "@shared/guestTypes";
import { buildCatalogLookup, readGuestSession, saveGuestSession } from "@/guest/guestSession";
import { useActiveRoomSession } from "../session";
import type { ComputerState, RoomEphemeralState } from "../session";

type Updater<T> = T | ((previous: T) => T);

export type UseRoomStateArgs = {
    isGuest: boolean;
    guestSession?: GuestSessionState | null;
    catalogItems?: Doc<"catalogItems">[] | null;
};

function resolveUpdate<T>(current: T, update: Updater<T>): T {
    return typeof update === "function" ? (update as (previous: T) => T)(current) : update;
}

/** Reads and updates the single active owner-room store. Persistence is delegated to its adapter. */
export function useRoomState({ isGuest, guestSession, catalogItems }: UseRoomStateArgs) {
    const { adapter, state, setState } = useActiveRoomSession();
    const catalogLookup = useMemo(() => buildCatalogLookup(catalogItems ?? undefined), [catalogItems]);
    const initialGuestSession = useMemo(() => {
        if (guestSession) return guestSession;
        if (isGuest) return readGuestSession(catalogLookup ?? null);
        return null;
    }, [guestSession, isGuest, catalogLookup]);

    const guestSessionLoadedRef = useRef(false);
    const authedShortcutsRef = useRef<Shortcut[]>(state.persisted.computer.shortcuts);
    const saveAuthedCursorColorRef = useRef<((next: string) => void) | null>(null);

    const updateEphemeral = useCallback(
        <K extends keyof RoomEphemeralState>(key: K, update: Updater<RoomEphemeralState[K]>) => {
            setState((previous) => ({
                ...previous,
                ephemeral: { ...previous.ephemeral, [key]: resolveUpdate(previous.ephemeral[key], update) },
            }));
        },
        [setState]
    );

    const setLocalItems = useCallback(
        (update: Updater<RoomItem[]>) => {
            let nextItems: RoomItem[] = [];
            setState((previous) => {
                nextItems = resolveUpdate(previous.persisted.items, update);
                return { ...previous, persisted: { ...previous.persisted, items: nextItems } };
            });
            if (adapter.kind === "guest-owner") void adapter.saveItems(nextItems);
        },
        [adapter, setState]
    );

    const setLocalShortcuts = useCallback(
        (update: Updater<Shortcut[]>) => {
            let nextShortcuts: Shortcut[] = [];
            let nextCursorColor: string | null = null;
            let changed = false;
            setState((previous) => {
                nextShortcuts = resolveUpdate(previous.persisted.computer.shortcuts, update);
                nextCursorColor = previous.persisted.computer.cursorColor;
                if (nextShortcuts === previous.persisted.computer.shortcuts) return previous;
                changed = true;
                return {
                    ...previous,
                    persisted: {
                        ...previous.persisted,
                        computer: { ...previous.persisted.computer, shortcuts: nextShortcuts },
                    },
                };
            });
            authedShortcutsRef.current = nextShortcuts;
            if (changed && adapter.kind === "guest-owner") {
                void adapter.saveComputer({ shortcuts: nextShortcuts, cursorColor: nextCursorColor });
            }
        },
        [adapter, setState]
    );

    const setCursorColor = useCallback(
        (update: Updater<string | null>) => {
            let nextComputer: ComputerState | null = null;
            setState((previous) => {
                const cursorColor = resolveUpdate(previous.persisted.computer.cursorColor, update);
                if (cursorColor === previous.persisted.computer.cursorColor) return previous;
                nextComputer = { ...previous.persisted.computer, cursorColor };
                return { ...previous, persisted: { ...previous.persisted, computer: nextComputer } };
            });
            if (adapter.kind === "guest-owner" && nextComputer) void adapter.saveComputer(nextComputer);
        },
        [adapter, setState]
    );

    const setOnboardingCompleted = useCallback(
        (update: Updater<boolean>) => {
            let completed = false;
            setState((previous) => {
                completed = resolveUpdate(previous.persisted.profile.onboardingCompleted, update);
                return {
                    ...previous,
                    persisted: {
                        ...previous.persisted,
                        profile: { ...previous.persisted.profile, onboardingCompleted: completed },
                    },
                };
            });
            if (completed) void adapter.saveProfile({ onboardingCompleted: true });
        },
        [adapter, setState]
    );

    const setDisplayName = useCallback(
        (update: Updater<string | null>) => {
            let displayName: string | null = null;
            setState((previous) => {
                displayName = resolveUpdate(previous.persisted.profile.displayName, update);
                return {
                    ...previous,
                    persisted: {
                        ...previous.persisted,
                        profile: { ...previous.persisted.profile, displayName },
                    },
                };
            });
            if (displayName !== null) void adapter.saveProfile({ displayName });
        },
        [adapter, setState]
    );

    const setInventory = useCallback(
        (update: Updater<Id<"catalogItems">[]>) => {
            let inventory: Id<"catalogItems">[] = [];
            setState((previous) => {
                inventory = resolveUpdate(previous.persisted.inventory, update);
                return { ...previous, persisted: { ...previous.persisted, inventory } };
            });
            if (adapter.kind === "guest-owner") saveGuestSession({ inventoryIds: inventory });
        },
        [adapter.kind, setState]
    );

    const setCoins = useCallback(
        (update: Updater<number>) => {
            let coins = 0;
            setState((previous) => {
                coins = resolveUpdate(previous.persisted.coins, update);
                return { ...previous, persisted: { ...previous.persisted, coins } };
            });
            if (adapter.kind === "guest-owner") saveGuestSession({ coins });
        },
        [adapter.kind, setState]
    );

    useEffect(() => {
        authedShortcutsRef.current = state.persisted.computer.shortcuts;
    }, [state.persisted.computer.shortcuts]);

    useEffect(() => {
        if (!isGuest || !catalogLookup || state.persisted.inventory.length > 0 || catalogLookup.starterIds.length === 0) return;
        setInventory([...catalogLookup.starterIds]);
    }, [catalogLookup, isGuest, setInventory, state.persisted.inventory.length]);

    return {
        initialGuestSession,
        mode: state.ephemeral.mode,
        setMode: (next: Updater<RoomEphemeralState["mode"]>) => updateEphemeral("mode", next),
        localItems: state.persisted.items,
        setLocalItems,
        selectedId: state.ephemeral.selectedItemId,
        setSelectedId: (next: Updater<string | null>) => updateEphemeral("selectedItemId", next),
        isDrawerOpen: state.ephemeral.drawerOpen,
        setIsDrawerOpen: (next: Updater<boolean>) => updateEphemeral("drawerOpen", next),
        draggedItemId: state.ephemeral.draggedItemId,
        setDraggedItemId: (next: Updater<string | null>) => updateEphemeral("draggedItemId", next),
        isComputerOpen: state.ephemeral.computerOpen,
        setIsComputerOpen: (next: Updater<boolean>) => updateEphemeral("computerOpen", next),
        isShareModalOpen: state.ephemeral.shareModalOpen,
        setIsShareModalOpen: (next: Updater<boolean>) => updateEphemeral("shareModalOpen", next),
        localShortcuts: state.persisted.computer.shortcuts,
        setLocalShortcuts,
        authedShortcutsRef,
        authedCursorColor: state.persisted.computer.cursorColor,
        setAuthedCursorColor: setCursorColor,
        saveAuthedCursorColorRef,
        musicPlayerItemId: state.ephemeral.musicPlayerItemId,
        setMusicPlayerItemId: (next: Updater<string | null>) => updateEphemeral("musicPlayerItemId", next),
        musicInteractionToken: state.ephemeral.musicInteractionToken,
        setMusicInteractionToken: (next: Updater<number>) => updateEphemeral("musicInteractionToken", next),
        guestOnboardingCompletedValue: state.persisted.profile.onboardingCompleted,
        setGuestOnboardingCompletedValue: setOnboardingCompleted,
        guestCoinsValue: state.persisted.coins,
        setGuestCoinsValue: setCoins,
        guestInventoryValue: state.persisted.inventory,
        setGuestInventoryValue: setInventory,
        displayNameValue: state.persisted.profile.displayName,
        setDisplayNameValue: setDisplayName,
        guestSessionLoadedRef,
        guestCursorColor: state.persisted.computer.cursorColor,
        setGuestCursorColor: setCursorColor,
    };
}
