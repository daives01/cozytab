import { useMemo, useCallback, useRef } from "react";
import { RoomToolbar } from "../RoomToolbar";
import { EditDrawer } from "../EditDrawer";
import { ComputerOverlay } from "@/computer/ComputerOverlay";
import { MusicPlayerModal } from "@/musicPlayer/MusicPlayerModal";
import { GameOverlay } from "@/games/components/GameOverlay";
import { ShareModal } from "../ShareModal";
import { Onboarding } from "../Onboarding";
import { Heart, UserPlus } from "lucide-react";
import { DailyRewardToast } from "./DailyRewardToast";
import { Toast } from "@/components/ui/toast";
import { ChatInput } from "../ChatInput";
import { ChatHint } from "./ChatHint";
import { MobileChatInput } from "./MobileChatInput";
import { LocalCursor } from "@/presence/LocalCursor";
import { TouchCursor } from "./TouchCursor";
import { useTouchOnly } from "@/hooks/useTouchCapability";
import type { RoomOverlaysProps } from "./RoomOverlays.types";
import type { RoomItem } from "@shared/guestTypes";

export function RoomOverlays({ ui, computer, music, onboarding, presence, game }: RoomOverlaysProps) {
    const isTouchOnly = useTouchOnly();
    const mobileChatInputRef = useRef<HTMLInputElement>(null);

    const activeMusicItem = useMemo(
        () => music.localItems.find((i) => i.id === music.musicPlayerItemId) ?? null,
        [music.localItems, music.musicPlayerItemId]
    );
    const visibleRoomVisitors = useMemo(
        () => presence.visitors.filter((visitor) => visitor.visitorId !== game.visitorId),
        [presence.visitors, game.visitorId]
    );

    const handleMusicSave = useCallback(
        (updatedItem: RoomItem) => {
            const updatedItems = music.localItems.map((i) => (i.id === updatedItem.id ? updatedItem : i));
            music.onSave(updatedItem, updatedItems);
        },
        [music]
    );

    const isTouchPlacementActive = isTouchOnly && ui.mode === "edit" && Boolean(ui.touchPlacementItemId);
    return (
        <>
            <RoomToolbar
                isGuest={ui.isGuest}
                mode={ui.mode}
                onToggleMode={ui.onToggleMode}
                shareAllowed={ui.shareAllowed}
                visitorCount={ui.visitorCount}
                onShareClick={ui.onShareClick}
                drawerOffset={ui.drawer.offset}
                drawerOrientation={ui.drawer.orientation}
            />

            <EditDrawer
                mode={ui.mode}
                isDrawerOpen={ui.drawer.isOpen}
                onDrawerToggle={ui.drawer.onToggle}
                draggedItemId={ui.draggedItemId}
                onDeleteItem={ui.onDeleteItem}
                onTouchPlaceItem={ui.onTouchPlaceItem}
                onTouchPlacementCancel={ui.onTouchPlacementCancel}
                highlightComputer={ui.highlightComputer}
                touchPlacementItemId={ui.touchPlacementItemId}
                isGuest={ui.isGuest}
                guestItems={ui.guestItems}
                placedCatalogItemIds={ui.placedCatalogItemIds}
                orientation={ui.drawer.orientation}
            />

            {isTouchPlacementActive && null}

            <ComputerOverlay
                isGuest={ui.isGuest}
                isComputerOpen={computer.isOpen}
                onCloseComputer={computer.onClose}
                shortcuts={computer.shortcuts}
                onUpdateShortcuts={computer.onUpdateShortcuts}
                userCurrency={computer.economy.userCurrency}
                nextRewardAt={computer.economy.nextRewardAt}
                loginStreak={computer.economy.loginStreak}
                onShopOpened={computer.onboardingCallbacks.onShopOpened}
                onOnboardingPurchase={computer.onboardingCallbacks.onOnboardingPurchase}
                isOnboardingShopStep={computer.onboardingCallbacks.isOnboardingShopStep}
                onPointerMove={computer.onPointerMove}
                guestCoins={computer.economy.guestCoins}
                onGuestCoinsChange={computer.economy.onGuestCoinsChange}
                startingCoins={computer.economy.startingCoins}
                guestInventory={computer.economy.guestInventory}
                onGuestPurchase={computer.economy.onGuestPurchase}
                onOnboardingShortcutAdded={computer.onboardingCallbacks.onOnboardingShortcutAdded}
                highlightFirstMusicItem={computer.onboardingCallbacks.highlightFirstMusicItem}
                displayName={computer.profile.displayName}
                username={computer.profile.username}
                onDisplayNameUpdated={computer.profile.onDisplayNameUpdated}
                cursorColor={computer.profile.cursorColor}
                onCursorColorChange={computer.profile.onCursorColorChange}
                timeOfDay={computer.time.timeOfDay}
                devTimeOfDay={computer.time.devTimeOfDay}
                onSetDevTimeOfDay={computer.time.onSetDevTimeOfDay}
                inRoomVisitors={visibleRoomVisitors}
            />

            {activeMusicItem && (
                <MusicPlayerModal item={activeMusicItem} onClose={music.onClose} onSave={handleMusicSave} />
            )}

            <GameOverlay
                isOpen={!!game.activeGameItemId && !!game.gameType}
                gameType={game.gameType ?? "chess"}
                itemId={game.activeGameItemId ?? ""}
                visitorId={game.visitorId}
                visitors={game.visitors}
                setGameMetadata={game.setGameMetadata}
                onClose={game.onClose}
                onPointerMove={computer.onPointerMove}
                onGameActiveChange={game.onGameActiveChange}
            />

            {!ui.isGuest && presence.isShareModalOpen && (
                <ShareModal onClose={presence.onCloseShareModal} activeInvites={presence.activeInvites} />
            )}

            {onboarding.active && onboarding.step && (
                <Onboarding
                    currentStep={onboarding.step}
                    onComplete={onboarding.onComplete}
                    onNext={onboarding.onAdvance}
                    onSkip={onboarding.onComplete}
                    isGuest={ui.isGuest}
                />
            )}

            {!ui.isGuest && onboarding.dailyRewardToast && <DailyRewardToast toast={onboarding.dailyRewardToast} />}

            {onboarding.stripeSuccessToast && (
                <Toast
                    tone="success"
                    icon={<Heart className="h-5 w-5" />}
                    title="Purchase successful!"
                    description="Thank you for your support!"
                    onClose={onboarding.onCloseStripeSuccessToast}
                />
            )}

            {onboarding.friendRefToast && (
                <Toast
                    tone={onboarding.friendRefToast.tone}
                    icon={<UserPlus className="h-5 w-5" />}
                    title={onboarding.friendRefToast.message}
                    onClose={onboarding.onCloseFriendRefToast}
                />
            )}

            {!ui.isGuest && presence.hasVisitors && !isTouchOnly && (
                <ChatInput
                    onMessageChange={presence.updateChatMessage}
                    disabled={
                        presence.isComputerOpenState ||
                        music.musicPlayerItemId !== null ||
                        presence.isShareModalOpen ||
                        presence.connectionState !== "connected"
                    }
                />
            )}

            {!ui.isGuest && presence.hasVisitors && isTouchOnly && (
                <MobileChatInput
                    ref={mobileChatInputRef}
                    onMessageChange={presence.updateChatMessage}
                    disabled={
                        presence.isComputerOpenState ||
                        music.musicPlayerItemId !== null ||
                        presence.isShareModalOpen ||
                        presence.connectionState !== "connected"
                    }
                />
            )}

            {!ui.isGuest &&
                presence.hasVisitors &&
                isTouchOnly &&
                !presence.isComputerOpenState &&
                !music.musicPlayerItemId &&
                !presence.isShareModalOpen && <ChatHint onTapToChat={() => mobileChatInputRef.current?.focus()} />}

            {!ui.isGuest && presence.connectionState !== "connected" && (
                <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-2">
                    <div className="rounded-xl border-2 border-[var(--color-foreground)] bg-[var(--color-background)] shadow-[4px_4px_0px_0px_var(--color-foreground)] px-4 py-3 flex items-center gap-3">
                        <div className="h-4 w-4 border-2 border-[var(--color-foreground)] border-t-transparent rounded-full animate-spin" />
                        <span className="text-sm font-medium">
                            {presence.connectionState === "connecting" ? "Connecting..." : "Reconnecting..."}
                        </span>
                    </div>
                </div>
            )}

            <LocalCursor
                x={presence.screenCursor.x}
                y={presence.screenCursor.y}
                chatMessage={!ui.isGuest && presence.hasVisitors ? presence.localChatMessage : null}
                cursorColor={computer.profile.cursorColor}
            />

            <TouchCursor cursorColor={computer.profile.cursorColor} />
        </>
    );
}
