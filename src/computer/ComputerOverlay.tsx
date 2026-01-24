import type { Shortcut } from "@/types";
import type { Id } from "@convex/_generated/dataModel";
import { ComputerScreen } from "./ComputerScreen";
import { useAtomValue, useSetAtom } from "jotai";
import {
    guestCoinsAtom,
    guestInventoryAtom,
    guestShortcutsAtom,
    guestNormalizedShortcutsAtom,
} from "@/guest/state";
import type { TimeOfDay } from "../room/types";

export interface ComputerOverlayProps {
    isGuest: boolean;
    isComputerOpen: boolean;
    onCloseComputer: () => void;
    shortcuts: Shortcut[];
    onUpdateShortcuts: (shortcuts: Shortcut[]) => void;
    userCurrency: number;
    nextRewardAt?: number;
    loginStreak?: number;
    onShopOpened?: () => void;
    onOnboardingPurchase?: () => void;
    onOnboardingShortcutAdded?: () => void;
    isOnboardingShopStep: boolean;
    onPointerMove: (clientX: number, clientY: number) => void;
    guestCoins?: number;
    onGuestCoinsChange?: (coins: number) => void;
    startingCoins: number;
    guestInventory: Id<"catalogItems">[];
    onGuestPurchase: (catalogItemId: Id<"catalogItems">) => void;
    highlightFirstMusicItem?: boolean;
    displayName?: string;
    username?: string;
    onDisplayNameUpdated?: (next: string) => void;
    cursorColor?: string;
    onCursorColorChange?: (next: string) => void;
    timeOfDay: TimeOfDay;
    devTimeOfDay: TimeOfDay | null;
    onSetDevTimeOfDay: (value: TimeOfDay | null) => void;
}

export function ComputerOverlay({
    isGuest,
    isComputerOpen,
    onCloseComputer,
    shortcuts,
    onUpdateShortcuts,
    userCurrency,
    nextRewardAt,
    loginStreak,
    onShopOpened,
    onOnboardingPurchase,
    onOnboardingShortcutAdded,
    isOnboardingShopStep,
    onPointerMove,
    guestCoins,
    onGuestCoinsChange,
    startingCoins,
    guestInventory,
    onGuestPurchase,
    highlightFirstMusicItem = false,
    displayName,
    username,
    onDisplayNameUpdated,
    cursorColor,
    onCursorColorChange,
    timeOfDay,
    devTimeOfDay,
    onSetDevTimeOfDay,
}: ComputerOverlayProps) {
    const guestShortcuts = useAtomValue(guestNormalizedShortcutsAtom);
    const setGuestShortcuts = useSetAtom(guestShortcutsAtom);
    const guestCoinsAtomValue = useAtomValue(guestCoinsAtom);
    const setGuestCoinsAtomValue = useSetAtom(guestCoinsAtom);
    const guestInventoryAtomValue = useAtomValue(guestInventoryAtom);
    const setGuestInventoryAtomValue = useSetAtom(guestInventoryAtom);

    const effectiveShortcuts = isGuest ? guestShortcuts : shortcuts;
    const handleShortcutsUpdate = isGuest ? setGuestShortcuts : onUpdateShortcuts;
    const effectiveGuestCoins = isGuest ? guestCoinsAtomValue : guestCoins;
    const handleGuestCoinsChange = isGuest ? setGuestCoinsAtomValue : onGuestCoinsChange;
    const effectiveGuestInventory = isGuest ? guestInventoryAtomValue : guestInventory;
    const handleGuestPurchase =
        isGuest && onGuestPurchase === undefined
            ? (itemId: Id<"catalogItems">) =>
                  setGuestInventoryAtomValue((prev) => (prev.includes(itemId) ? prev : [...prev, itemId]))
            : onGuestPurchase;

    if (!isComputerOpen) return null;

    return (
        <ComputerScreen
            shortcuts={effectiveShortcuts}
            onClose={onCloseComputer}
            onUpdateShortcuts={handleShortcutsUpdate}
            userCurrency={userCurrency}
            nextRewardAt={nextRewardAt}
            loginStreak={loginStreak}
            onShopOpened={onShopOpened}
            onOnboardingPurchase={onOnboardingPurchase}
            onOnboardingShortcutAdded={onOnboardingShortcutAdded}
            isOnboardingShopStep={isOnboardingShopStep}
            onPointerMove={onPointerMove}
            isGuest={isGuest}
            guestCoins={effectiveGuestCoins}
            onGuestCoinsChange={handleGuestCoinsChange}
            startingCoins={startingCoins}
            guestInventory={effectiveGuestInventory}
            onGuestPurchase={handleGuestPurchase}
            highlightFirstMusicItem={highlightFirstMusicItem}
            displayName={displayName}
            username={username}
            onDisplayNameUpdated={onDisplayNameUpdated}
            cursorColor={cursorColor}
            onCursorColorChange={onCursorColorChange}
            timeOfDay={timeOfDay}
            devTimeOfDay={devTimeOfDay}
            onSetDevTimeOfDay={onSetDevTimeOfDay}
        />
    );
}
