import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Doc, Id } from "@convex/_generated/dataModel";
import type { GuestSessionState, Shortcut } from "@shared/guestTypes";
import { buildCatalogLookup, normalizeGuestShortcuts, readGuestSession, saveGuestSession } from "@/guest/guestSession";
import { useActiveRoomSession } from "../session";

type Updater<T> = T | ((previous: T) => T);

export type UseRoomStateArgs = {
    isGuest: boolean;
    guestSession?: GuestSessionState | null;
    catalogItems?: Doc<"catalogItems">[] | null;
};

export function useRoomState({ isGuest, guestSession, catalogItems }: UseRoomStateArgs) {
    const { session: editingSession, state: editing } = useActiveRoomSession();
    const catalogLookup = useMemo(() => buildCatalogLookup(catalogItems ?? undefined), [catalogItems]);

    const initialGuestSession = useMemo(() => {
        if (guestSession) return guestSession;

        if (isGuest) return readGuestSession(catalogLookup ?? null);

        return null;
    }, [guestSession, isGuest, catalogLookup]);

    const initial = initialGuestSession ?? {
        shortcuts: [],
        cursorColor: null,
        onboardingCompleted: false,
        coins: 0,
        inventoryIds: [],
    };

    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [isComputerOpen, setIsComputerOpen] = useState(false);
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [musicPlayerItemId, setMusicPlayerItemId] = useState<string | null>(null);
    const [musicInteractionToken, setMusicInteractionToken] = useState(0);
    const [localShortcuts, setLocalShortcutsState] = useState<Shortcut[]>(normalizeGuestShortcuts(initial.shortcuts));
    const [cursorColor, setCursorColorState] = useState<string | null>(initial.cursorColor);
    const [onboardingCompleted, setOnboardingCompletedState] = useState(initial.onboardingCompleted);
    const [coins, setCoinsState] = useState(initial.coins);
    const [inventory, setInventoryState] = useState<Id<"catalogItems">[]>(initial.inventoryIds);
    const [displayName, setDisplayName] = useState<string | null>(null);
    const authedShortcutsRef = useRef(localShortcuts);
    const saveAuthedCursorColorRef = useRef<((next: string) => void) | null>(null);

    const setLocalShortcuts = useCallback(
        (update: Updater<Shortcut[]>) => {
            setLocalShortcutsState((previous) => {
                const next = typeof update === "function" ? update(previous) : update;
                authedShortcutsRef.current = next;

                if (isGuest) saveGuestSession({ shortcuts: next });

                return next;
            });
        },
        [isGuest],
    );

    const setCursorColor = useCallback(
        (update: Updater<string | null>) => {
            setCursorColorState((previous) => {
                const next = typeof update === "function" ? update(previous) : update;

                if (isGuest && next) saveGuestSession({ cursorColor: next });

                return next;
            });
        },
        [isGuest],
    );

    const setOnboardingCompleted = useCallback(
        (update: Updater<boolean>) => {
            setOnboardingCompletedState((previous) => {
                const next = typeof update === "function" ? update(previous) : update;

                if (isGuest && next) saveGuestSession({ onboardingCompleted: true });

                return next;
            });
        },
        [isGuest],
    );

    const setCoins = useCallback(
        (update: Updater<number>) => {
            setCoinsState((previous) => {
                const next = typeof update === "function" ? update(previous) : update;

                if (isGuest) saveGuestSession({ coins: next });

                return next;
            });
        },
        [isGuest],
    );

    const setInventory = useCallback(
        (update: Updater<Id<"catalogItems">[]>) => {
            setInventoryState((previous) => {
                const next = typeof update === "function" ? update(previous) : update;

                if (isGuest) saveGuestSession({ inventoryIds: next });

                return next;
            });
        },
        [isGuest],
    );

    useEffect(() => {
        authedShortcutsRef.current = localShortcuts;
    }, [localShortcuts]);

    useEffect(() => {
        if (!isGuest || !catalogLookup || inventory.length > 0 || catalogLookup.starterIds.length === 0) return;
        const timer = setTimeout(() => setInventory([...catalogLookup.starterIds]), 0);

        return () => clearTimeout(timer);
    }, [catalogLookup, inventory.length, isGuest, setInventory]);

    return {
        editingSession,
        initialGuestSession,
        mode: editing.mode,
        localItems: editing.items,
        selectedId: editing.selectedItemId,
        setSelectedId: (next: Updater<string | null>) =>
            editingSession.select(typeof next === "function" ? next(editing.selectedItemId) : next),
        isDrawerOpen,
        setIsDrawerOpen,
        draggedItemId: editing.draggedItemId,
        touchPlacementId: editing.placingCatalogItemId,
        isComputerOpen,
        setIsComputerOpen,
        isShareModalOpen,
        setIsShareModalOpen,
        localShortcuts,
        setLocalShortcuts,
        authedShortcutsRef,
        authedCursorColor: cursorColor,
        setAuthedCursorColor: setCursorColor,
        saveAuthedCursorColorRef,
        musicPlayerItemId,
        setMusicPlayerItemId,
        musicInteractionToken,
        setMusicInteractionToken,
        guestOnboardingCompletedValue: onboardingCompleted,
        setGuestOnboardingCompletedValue: setOnboardingCompleted,
        guestCoinsValue: coins,
        setGuestCoinsValue: setCoins,
        guestInventoryValue: inventory,
        setGuestInventoryValue: setInventory,
        displayNameValue: displayName,
        setDisplayNameValue: setDisplayName,
        guestCursorColor: cursorColor,
        setGuestCursorColor: setCursorColor,
        saveStatus: editing.saveStatus,
        saveError: editing.saveError,
        canSwitchRooms: editing.canSwitchRooms,
    };
}
