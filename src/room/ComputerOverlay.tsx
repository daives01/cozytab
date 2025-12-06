import type { ComputerShortcut } from "../types";
import { ComputerScreen } from "./ComputerScreen";
import { useAtomValue, useSetAtom } from "jotai";
import {
    guestCoinsAtom,
    guestInventoryAtom,
    guestShortcutsAtom,
    guestNormalizedShortcutsAtom,
} from "./guestState";

interface ComputerOverlayProps {
    isGuest: boolean;
    isComputerOpen: boolean;
    onCloseComputer: () => void;
    shortcuts: ComputerShortcut[];
    onUpdateShortcuts: (shortcuts: ComputerShortcut[]) => void;
    userCurrency: number;
    lastDailyReward?: number;
    onShopOpened?: () => void;
    onOnboardingPurchase?: () => void;
    onOnboardingShortcutAdded?: () => void;
    isOnboardingShopStep: boolean;
    onPointerMove: (clientX: number, clientY: number) => void;
    guestCoins?: number;
    onGuestCoinsChange?: (coins: number) => void;
    startingCoins: number;
    guestInventory: string[];
    onGuestPurchase: (catalogItemId: string) => void;
    highlightFirstMusicItem?: boolean;
    displayName?: string;
    username?: string;
    onDisplayNameUpdated?: (next: string) => void;
    cursorColor?: string;
    onCursorColorChange?: (next: string) => void;
}

export function ComputerOverlay({
    isGuest,
    isComputerOpen,
    onCloseComputer,
    shortcuts,
    onUpdateShortcuts,
    userCurrency,
    lastDailyReward,
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
            ? (itemId: string) =>
                  setGuestInventoryAtomValue((prev) => (prev.includes(itemId) ? prev : [...prev, itemId]))
            : onGuestPurchase;

    if (!isComputerOpen) return null;

    return (
        <ComputerScreen
            shortcuts={effectiveShortcuts}
            onClose={onCloseComputer}
            onUpdateShortcuts={handleShortcutsUpdate}
            userCurrency={userCurrency}
            lastDailyReward={lastDailyReward}
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
        />
    );
}
