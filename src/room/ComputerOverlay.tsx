import type { ComputerShortcut } from "../types";
import { ComputerScreen } from "./ComputerScreen";

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
}: ComputerOverlayProps) {
    return (
        <>
            {isComputerOpen && (
                <ComputerScreen
                    shortcuts={shortcuts}
                    onClose={onCloseComputer}
                    onUpdateShortcuts={onUpdateShortcuts}
                    userCurrency={userCurrency}
                    lastDailyReward={lastDailyReward}
                    onShopOpened={onShopOpened}
                    onOnboardingPurchase={onOnboardingPurchase}
                    onOnboardingShortcutAdded={onOnboardingShortcutAdded}
                    isOnboardingShopStep={isOnboardingShopStep}
                    onPointerMove={onPointerMove}
                    isGuest={isGuest}
                    guestCoins={guestCoins}
                    onGuestCoinsChange={onGuestCoinsChange}
                    startingCoins={startingCoins}
                    guestInventory={guestInventory}
                    onGuestPurchase={onGuestPurchase}
                    highlightFirstMusicItem={highlightFirstMusicItem}
                />
            )}
        </>
    );
}
