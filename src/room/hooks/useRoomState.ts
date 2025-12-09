import { useEffect, useMemo, useRef, useCallback } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import type { ComputerShortcut } from "../../types";
import type { GuestSessionState } from "../../../shared/guestTypes";
import {
    coinsAtom,
    computerOpenAtom,
    cursorColorAtom,
    displayNameAtom,
    drawerOpenAtom,
    draggedItemIdAtom,
    inventoryAtom,
    itemsAtom,
    modeAtom,
    musicAutoplayAtom,
    musicPlayerItemIdAtom,
    onboardingCompletedAtom,
    selectedIdAtom,
    shareModalOpenAtom,
    shortcutsAtom,
    type Mode,
} from "../state/roomAtoms";
import {
    guestCoinsAtom,
    guestComputerOpenAtom,
    guestCursorColorAtom,
    guestDisplayNameAtom,
    guestDrawerOpenAtom,
    guestDraggedItemIdAtom,
    guestInventoryAtom,
    guestModeAtom,
    guestMusicPlayerItemIdAtom,
    guestNormalizedShortcutsAtom,
    guestRoomItemsAtom,
    guestSelectedItemIdAtom,
    guestShareModalOpenAtom,
    guestShortcutsAtom,
    guestOnboardingCompletedAtom,
    normalizeGuestShortcuts,
} from "../guestState";
import { readGuestSession, buildCatalogLookup } from "../guestSession";
import type { Doc } from "../../../convex/_generated/dataModel";

export type UseRoomStateArgs = {
    isGuest: boolean;
    guestSession?: GuestSessionState | null;
    catalogItems?: Doc<"catalogItems">[] | null;
};

export function useRoomState({ isGuest, guestSession, catalogItems }: UseRoomStateArgs) {
    const catalogLookup = useMemo(() => buildCatalogLookup(catalogItems ?? undefined), [catalogItems]);
    const initialGuestSession = useMemo(() => {
        if (guestSession) return guestSession;
        if (isGuest) return readGuestSession(catalogLookup ?? null);
        return null;
    }, [guestSession, isGuest, catalogLookup]);

    const authedShortcutsRef = useRef<ComputerShortcut[]>(normalizeGuestShortcuts(initialGuestSession?.shortcuts ?? []));
    const saveAuthedCursorColorRef = useRef<((next: string) => void) | null>(null);
    const guestSessionLoadedRef = useRef(false);

    const guestModeValue = useAtomValue(guestModeAtom);
    const setGuestMode = useSetAtom(guestModeAtom);
    const guestItems = useAtomValue(guestRoomItemsAtom);
    const setGuestItems = useSetAtom(guestRoomItemsAtom);
    const guestSelectedId = useAtomValue(guestSelectedItemIdAtom);
    const setGuestSelectedId = useSetAtom(guestSelectedItemIdAtom);
    const guestDrawerOpen = useAtomValue(guestDrawerOpenAtom);
    const setGuestDrawerOpen = useSetAtom(guestDrawerOpenAtom);
    const guestDraggedItemId = useAtomValue(guestDraggedItemIdAtom);
    const setGuestDraggedItemId = useSetAtom(guestDraggedItemIdAtom);
    const guestComputerOpen = useAtomValue(guestComputerOpenAtom);
    const setGuestComputerOpen = useSetAtom(guestComputerOpenAtom);
    const guestShareModalOpen = useAtomValue(guestShareModalOpenAtom);
    const setGuestShareModalOpen = useSetAtom(guestShareModalOpenAtom);
    const guestShortcuts = useAtomValue(guestNormalizedShortcutsAtom);
    const setGuestShortcuts = useSetAtom(guestShortcutsAtom);
    const guestMusicPlayerItemId = useAtomValue(guestMusicPlayerItemIdAtom);
    const setGuestMusicPlayerItemId = useSetAtom(guestMusicPlayerItemIdAtom);
    const guestOnboardingCompleted = useAtomValue(guestOnboardingCompletedAtom);
    const setGuestOnboardingCompleted = useSetAtom(guestOnboardingCompletedAtom);
    const guestCoins = useAtomValue(guestCoinsAtom);
    const setGuestCoins = useSetAtom(guestCoinsAtom);
    const guestInventory = useAtomValue(guestInventoryAtom);
    const setGuestInventory = useSetAtom(guestInventoryAtom);
    const guestDisplayName = useAtomValue(guestDisplayNameAtom);
    const setGuestDisplayName = useSetAtom(guestDisplayNameAtom);
    const guestCursorColorValue = useAtomValue(guestCursorColorAtom);
    const setGuestCursorColor = useSetAtom(guestCursorColorAtom);

    const authedMode = useAtomValue(modeAtom);
    const setAuthedMode = useSetAtom(modeAtom);
    const authedItems = useAtomValue(itemsAtom);
    const setAuthedItems = useSetAtom(itemsAtom);
    const authedSelectedId = useAtomValue(selectedIdAtom);
    const setAuthedSelectedId = useSetAtom(selectedIdAtom);
    const authedDrawerOpen = useAtomValue(drawerOpenAtom);
    const setAuthedDrawerOpen = useSetAtom(drawerOpenAtom);
    const authedDraggedItemId = useAtomValue(draggedItemIdAtom);
    const setAuthedDraggedItemId = useSetAtom(draggedItemIdAtom);
    const authedComputerOpen = useAtomValue(computerOpenAtom);
    const setAuthedComputerOpen = useSetAtom(computerOpenAtom);
    const authedShareModalOpen = useAtomValue(shareModalOpenAtom);
    const setAuthedShareModalOpen = useSetAtom(shareModalOpenAtom);
    const authedShortcuts = useAtomValue(shortcutsAtom);
    const setAuthedShortcuts = useSetAtom(shortcutsAtom);
    const authedCursorColor = useAtomValue(cursorColorAtom);
    const setAuthedCursorColor = useSetAtom(cursorColorAtom);
    const authedMusicPlayerItemId = useAtomValue(musicPlayerItemIdAtom);
    const setAuthedMusicPlayerItemId = useSetAtom(musicPlayerItemIdAtom);
    const musicAutoplay = useAtomValue(musicAutoplayAtom);
    const setMusicAutoplay = useSetAtom(musicAutoplayAtom);
    const guestOnboardingCompletedState = useAtomValue(onboardingCompletedAtom);
    const setGuestOnboardingCompletedState = useSetAtom(onboardingCompletedAtom);
    const guestCoinsState = useAtomValue(coinsAtom);
    const setGuestCoinsState = useSetAtom(coinsAtom);
    const guestInventoryState = useAtomValue(inventoryAtom);
    const setGuestInventoryState = useSetAtom(inventoryAtom);
    const localDisplayName = useAtomValue(displayNameAtom);
    const setLocalDisplayName = useSetAtom(displayNameAtom);

    const mode = isGuest ? guestModeValue : authedMode;
    const setMode = useCallback(
        (next: Mode) => {
            if (isGuest) {
                setGuestMode(next);
            } else {
                setAuthedMode(next);
            }
        },
        [isGuest, setAuthedMode, setGuestMode]
    );

    const localItems = isGuest ? guestItems : authedItems;
    const setLocalItems = isGuest ? setGuestItems : setAuthedItems;

    const selectedId = isGuest ? guestSelectedId : authedSelectedId;
    const setSelectedId = isGuest ? setGuestSelectedId : setAuthedSelectedId;

    const isDrawerOpen = isGuest ? guestDrawerOpen : authedDrawerOpen;
    const setIsDrawerOpen = isGuest ? setGuestDrawerOpen : setAuthedDrawerOpen;

    const draggedItemId = isGuest ? guestDraggedItemId : authedDraggedItemId;
    const setDraggedItemId = isGuest ? setGuestDraggedItemId : setAuthedDraggedItemId;

    const isComputerOpen = isGuest ? guestComputerOpen : authedComputerOpen;
    const setIsComputerOpen = isGuest ? setGuestComputerOpen : setAuthedComputerOpen;

    const isShareModalOpen = isGuest ? guestShareModalOpen : authedShareModalOpen;
    const setIsShareModalOpen = isGuest ? setGuestShareModalOpen : setAuthedShareModalOpen;

    const localShortcuts: ComputerShortcut[] = isGuest ? guestShortcuts : authedShortcuts;
    const setLocalShortcuts = isGuest ? setGuestShortcuts : setAuthedShortcuts;

    const musicPlayerItemId = isGuest ? guestMusicPlayerItemId : authedMusicPlayerItemId;
    const setMusicPlayerItemId = isGuest ? setGuestMusicPlayerItemId : setAuthedMusicPlayerItemId;

    const guestOnboardingCompletedValue = isGuest ? guestOnboardingCompleted : guestOnboardingCompletedState;
    const setGuestOnboardingCompletedValue = isGuest ? setGuestOnboardingCompleted : setGuestOnboardingCompletedState;

    const guestCoinsValue = isGuest ? guestCoins : guestCoinsState;
    const setGuestCoinsValue = isGuest ? setGuestCoins : setGuestCoinsState;

    const guestInventoryValue = isGuest ? guestInventory : guestInventoryState;
    const setGuestInventoryValue = isGuest ? setGuestInventory : setGuestInventoryState;

    const displayNameValue = isGuest ? guestDisplayName : localDisplayName;
    const setDisplayNameValue = isGuest ? setGuestDisplayName : setLocalDisplayName;

    const guestCursorColor = guestCursorColorValue;

    useEffect(() => {
        if (!isGuest) {
            authedShortcutsRef.current = localShortcuts;
        }
    }, [isGuest, localShortcuts]);

    useEffect(() => {
        if (!isGuest) return;
        if (!catalogLookup) return;
        if (guestInventoryValue.length > 0) return;
        if (catalogLookup.starterIds.length === 0) return;
        setGuestInventoryValue(() => [...catalogLookup.starterIds]);
    }, [catalogLookup, guestInventoryValue.length, isGuest, setGuestInventoryValue]);

    return {
        initialGuestSession,
        mode,
        setMode,
        localItems,
        setLocalItems,
        selectedId,
        setSelectedId,
        isDrawerOpen,
        setIsDrawerOpen,
        draggedItemId,
        setDraggedItemId,
        isComputerOpen,
        setIsComputerOpen,
        isShareModalOpen,
        setIsShareModalOpen,
        localShortcuts,
        setLocalShortcuts,
        authedShortcutsRef,
        authedCursorColor,
        setAuthedCursorColor,
        saveAuthedCursorColorRef,
        musicPlayerItemId,
        setMusicPlayerItemId,
        musicAutoplay,
        setMusicAutoplay,
        guestOnboardingCompletedValue,
        setGuestOnboardingCompletedValue,
        guestCoinsValue,
        setGuestCoinsValue,
        guestInventoryValue,
        setGuestInventoryValue,
        displayNameValue,
        setDisplayNameValue,
        guestSessionLoadedRef,
        guestCursorColor,
        setGuestCursorColor,
    };
}

