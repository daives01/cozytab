import type { Shortcut } from "@shared/guestTypes";
import type { Id } from "@convex/_generated/dataModel";
import { ComputerScreen } from "./ComputerScreen";
import type { TimeOfDay } from "../room/types";
import type { VisitorState } from "@/hooks/useWebSocketPresence";

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
    inRoomVisitors?: VisitorState[];
    canSwitchRooms: boolean;
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
    inRoomVisitors,
    canSwitchRooms,
}: ComputerOverlayProps) {
    if (!isComputerOpen) return null;

    return (
        <ComputerScreen
            shortcuts={shortcuts}
            onClose={onCloseComputer}
            onUpdateShortcuts={onUpdateShortcuts}
            userCurrency={userCurrency}
            nextRewardAt={nextRewardAt}
            loginStreak={loginStreak}
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
            displayName={displayName}
            username={username}
            onDisplayNameUpdated={onDisplayNameUpdated}
            cursorColor={cursorColor}
            onCursorColorChange={onCursorColorChange}
            timeOfDay={timeOfDay}
            devTimeOfDay={devTimeOfDay}
            onSetDevTimeOfDay={onSetDevTimeOfDay}
            inRoomVisitors={inRoomVisitors}
            canSwitchRooms={canSwitchRooms}
        />
    );
}
