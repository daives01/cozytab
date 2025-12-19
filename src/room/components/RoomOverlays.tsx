import { ToolbarWithDrawer } from "./ToolbarWithDrawer";
import { ComputerOverlay } from "@/computer/ComputerOverlay";
import { MusicPlayerModal } from "@/musicPlayer/MusicPlayerModal";
import { ShareModal } from "../ShareModal";
import { Onboarding } from "../Onboarding";
import type { OnboardingStep } from "../Onboarding";
import { DailyRewardToast } from "./DailyRewardToast";
import { ChatInput } from "../ChatInput";
import { ChatHint } from "./ChatHint";
import { LocalCursor } from "@/presence/LocalCursor";
import type { RoomItem, ComputerShortcut } from "@/types";
import type { Id } from "@convex/_generated/dataModel";
import type { DailyRewardToastPayload, TimeOfDay } from "../types";
import type { GuestDrawerItem } from "../AssetDrawer/types";

interface RoomOverlaysProps {
    isGuest: boolean;
    mode: "view" | "edit";
    shareAllowed: boolean;
    visitorCount: number;
    drawerOffset: number;
    drawerOrientation: "left" | "bottom";
    isDrawerOpen: boolean;
    draggedItemId: string | null;
    highlightComputer: boolean;
    guestItems?: GuestDrawerItem[];
    placedCatalogItemIds: Id<"catalogItems">[];
    onToggleMode: () => void;
    onShareClick: () => void;
    onDrawerToggle: () => void;
    onDeleteItem: (id: string) => void;

    // Computer overlay
    isComputerOpen: boolean;
    onCloseComputer: () => void;
    shortcuts: ComputerShortcut[];
    onUpdateShortcuts: (shortcuts: ComputerShortcut[]) => void;
    userCurrency: number;
    nextRewardAt?: number;
    loginStreak?: number;
    onShopOpened: () => void;
    onOnboardingPurchase: () => void;
    isOnboardingShopStep: boolean;
    onPointerMove: (x: number, y: number) => void;
    guestCoins: number;
    onGuestCoinsChange: (coins: number | ((prev: number) => number)) => void;
    startingCoins: number;
    guestInventory: Id<"catalogItems">[];
    onGuestPurchase: (itemId: Id<"catalogItems">) => void;
    onOnboardingShortcutAdded: () => void;
    highlightFirstMusicItem: boolean;
    displayName?: string;
    username?: string;
    onDisplayNameUpdated?: (next: string | null) => void;
    cursorColor: string;
    onCursorColorChange: (next: string) => void;
    timeOfDay: TimeOfDay;
    devTimeOfDay: TimeOfDay | null;
    onSetDevTimeOfDay: (next: TimeOfDay | null) => void;

    // Music modal
    musicPlayerItemId: string | null;
    localItems: RoomItem[];
    onMusicSave: (updatedItem: RoomItem, updatedItems: RoomItem[]) => void;
    onCloseMusic: () => void;

    // Onboarding / reward
    onboardingActive: boolean;
    onboardingStep: OnboardingStep | null;
    onAdvanceOnboarding: () => void;
    onCompleteOnboarding: () => void;
    dailyRewardToast: DailyRewardToastPayload | null;

    // Chat / cursors
    hasVisitors: boolean;
    isComputerOpenState: boolean;
    isShareModalOpen: boolean;
    onCloseShareModal: () => void;
    updateChatMessage: (msg: string | null) => void;
    localChatMessage: string | null;
    screenCursor: { x: number; y: number };
    connectionState: "connecting" | "connected" | "reconnecting";
}

export function RoomOverlays({
    isGuest,
    mode,
    shareAllowed,
    visitorCount,
    drawerOffset,
    drawerOrientation,
    isDrawerOpen,
    draggedItemId,
    highlightComputer,
    guestItems,
    placedCatalogItemIds,
    onToggleMode,
    onShareClick,
    onDrawerToggle,
    onDeleteItem,
    isComputerOpen,
    onCloseComputer,
    shortcuts,
    onUpdateShortcuts,
    userCurrency,
    nextRewardAt,
    loginStreak,
    onShopOpened,
    onOnboardingPurchase,
    isOnboardingShopStep,
    onPointerMove,
    guestCoins,
    onGuestCoinsChange,
    startingCoins,
    guestInventory,
    onGuestPurchase,
    onOnboardingShortcutAdded,
    highlightFirstMusicItem,
    displayName,
    username,
    onDisplayNameUpdated,
    cursorColor,
    onCursorColorChange,
    timeOfDay,
    devTimeOfDay,
    onSetDevTimeOfDay,
    musicPlayerItemId,
    localItems,
    onMusicSave,
    onCloseMusic,
    onboardingActive,
    onboardingStep,
    onAdvanceOnboarding,
    onCompleteOnboarding,
    dailyRewardToast,
    hasVisitors,
    isComputerOpenState,
    isShareModalOpen,
    onCloseShareModal,
    updateChatMessage,
    localChatMessage,
    screenCursor,
    connectionState,
}: RoomOverlaysProps) {
    return (
        <>
            <ToolbarWithDrawer
                isGuest={isGuest}
                mode={mode}
                shareAllowed={shareAllowed}
                visitorCount={visitorCount}
                drawerOffset={drawerOffset}
                drawerOrientation={drawerOrientation}
                isDrawerOpen={isDrawerOpen}
                draggedItemId={draggedItemId}
                highlightComputer={highlightComputer}
                guestItems={guestItems}
                placedCatalogItemIds={placedCatalogItemIds}
                onToggleMode={onToggleMode}
                onShareClick={onShareClick}
                onDrawerToggle={onDrawerToggle}
                onDeleteItem={onDeleteItem}
            />

            <ComputerOverlay
                isGuest={isGuest}
                isComputerOpen={isComputerOpen}
                onCloseComputer={onCloseComputer}
                shortcuts={shortcuts}
                onUpdateShortcuts={onUpdateShortcuts}
                userCurrency={userCurrency}
                nextRewardAt={nextRewardAt}
                loginStreak={loginStreak}
                onShopOpened={onShopOpened}
                onOnboardingPurchase={onOnboardingPurchase}
                isOnboardingShopStep={isOnboardingShopStep}
                onPointerMove={onPointerMove}
                guestCoins={guestCoins}
                onGuestCoinsChange={onGuestCoinsChange}
                startingCoins={startingCoins}
                guestInventory={guestInventory}
                onGuestPurchase={onGuestPurchase}
                onOnboardingShortcutAdded={onOnboardingShortcutAdded}
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

            {musicPlayerItemId && (() => {
                const item = localItems.find((i) => i.id === musicPlayerItemId);
                return item ? (
                    <MusicPlayerModal
                        item={item}
                        onClose={onCloseMusic}
                        onSave={(updatedItem) => {
                            const updatedItems = localItems.map((i) => (i.id === updatedItem.id ? updatedItem : i));
                            onMusicSave(updatedItem, updatedItems);
                        }}
                    />
                ) : null;
            })()}

            {!isGuest && isShareModalOpen && <ShareModal onClose={onCloseShareModal} />}

            {onboardingActive && onboardingStep && (
                <Onboarding
                    currentStep={onboardingStep}
                    onComplete={onCompleteOnboarding}
                    onNext={onAdvanceOnboarding}
                    onSkip={onCompleteOnboarding}
                    isGuest={isGuest}
                />
            )}

            {!isGuest && dailyRewardToast && <DailyRewardToast toast={dailyRewardToast} />}

            {!isGuest && hasVisitors && (
                <ChatInput
                    onMessageChange={updateChatMessage}
                    disabled={
                        isComputerOpenState ||
                        musicPlayerItemId !== null ||
                        isShareModalOpen ||
                        connectionState !== "connected"
                    }
                />
            )}

            {!isGuest && hasVisitors && !isComputerOpenState && !musicPlayerItemId && !isShareModalOpen && <ChatHint />}

            {!isGuest && connectionState !== "connected" && (
                <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-2">
                    <div className="rounded-xl border-2 border-[var(--color-foreground)] bg-[var(--color-background)] shadow-[4px_4px_0px_0px_var(--color-foreground)] px-4 py-3 flex items-center gap-3">
                        <div className="h-4 w-4 border-2 border-[var(--color-foreground)] border-t-transparent rounded-full animate-spin" />
                        <span className="text-sm font-medium">
                            {connectionState === "connecting" ? "Connecting..." : "Reconnecting..."}
                        </span>
                    </div>
                </div>
            )}

            <LocalCursor
                x={screenCursor.x}
                y={screenCursor.y}
                chatMessage={!isGuest && hasVisitors ? localChatMessage : null}
                cursorColor={cursorColor}
            />
        </>
    );
}
