import { useMemo } from "react";
import type { RoomItem } from "@shared/guestTypes";
import type { GameType } from "@convex/lib/categories";
import type { Id, Doc } from "@convex/_generated/dataModel";
import type { RoomOverlaysProps } from "../components/RoomOverlays.types";
import type { OnboardingStep } from "../Onboarding";
import type { DailyRewardToastPayload, TimeOfDay } from "../types";
import type { GuestDrawerItem } from "../AssetDrawer/types";
import type { VisitorState } from "@/hooks/useWebSocketPresence";
import type { useRoomState } from "./useRoomState";
import type { useRoomHandlers } from "./useRoomHandlers";
import type { useRoomComputed } from "./useRoomComputed";

interface UseRoomOverlaysModelArgs {
    isGuest: boolean;
    roomState: ReturnType<typeof useRoomState>;
    computed: ReturnType<typeof useRoomComputed>;
    handlers: ReturnType<typeof useRoomHandlers>;
    localItems: RoomItem[];
    catalogItems: Doc<"catalogItems">[] | undefined;
    placedCatalogItemIds: Id<"catalogItems">[];

    layout: {
        toolbarOffset: number;
        drawerOrientation: "left" | "bottom";
    };

    onboarding: {
        onboardingStep: OnboardingStep | null;
        onboardingActive: boolean;
        advanceOnboarding: () => void;
        handleOnboardingComplete: () => void;
    };

    presence: {
        hasVisitors: boolean;
        visitorCount: number;
        updateChatMessage: (msg: string | null) => void;
        localChatMessage: string | null;
        screenCursor: { x: number; y: number };
        connectionState: "connecting" | "connected" | "reconnecting";
        wsRef: React.RefObject<WebSocket | null>;
        visitors: VisitorState[];
        activeInvites?: Doc<"roomInvites">[] | null;
    };

    economy: {
        userCurrency: number;
        effectiveNextRewardAt?: number;
        effectiveLoginStreak?: number;
        updateGuestCoins: (coins: number | ((prev: number) => number)) => void;
        updateGuestInventory: (updater: (prev: Id<"catalogItems">[]) => Id<"catalogItems">[]) => void;
        startingCoins: number;
    };

    profile: {
        cursorColor: string;
        handleCursorColorChange: (next: string) => void;
    };

    time: {
        timeOfDay: TimeOfDay;
        overrideTimeOfDay: TimeOfDay | null;
        setOverrideTimeOfDay: (next: TimeOfDay | null) => void;
    };

    toasts: {
        dailyRewardToast: DailyRewardToastPayload | null;
        showStripeSuccessToast: boolean;
        setShowStripeSuccessToast: (next: boolean) => void;
        friendRefToast: { message: string; tone: "success" | "default" } | null;
        setFriendRefToast: (next: { message: string; tone: "success" | "default" } | null) => void;
    };

    game: {
        activeGameItemId: string | null;
        setActiveGameItemId: (id: string | null) => void;
        handleGameActiveChange: (gameItemId: string | null) => void;
        visitorId: string;
        setGameMetadata: (metadata: Record<string, unknown> | null) => void;
    };

    room: { _id: Id<"rooms"> } | null | undefined;
    saveRoom: (args: { roomId: Id<"rooms">; items: RoomItem[] }) => void;
}

export function useRoomOverlaysModel({
    isGuest,
    roomState,
    computed,
    handlers,
    localItems,
    catalogItems,
    placedCatalogItemIds,
    layout,
    onboarding,
    presence,
    economy,
    profile,
    time,
    toasts,
    game,
    room,
    saveRoom,
}: UseRoomOverlaysModelArgs): RoomOverlaysProps {
    return useMemo((): RoomOverlaysProps => {
        const ui: RoomOverlaysProps["ui"] = {
            isGuest,
            mode: roomState.mode,
            shareAllowed: computed.shareAllowed,
            visitorCount: presence.visitorCount,
            drawer: {
                offset: layout.toolbarOffset,
                orientation: layout.drawerOrientation,
                isOpen: roomState.isDrawerOpen,
                onToggle: handlers.handleDrawerToggle,
            },
            draggedItemId: roomState.draggedItemId,
            highlightComputer: onboarding.onboardingStep === "place-computer",
            guestItems: computed.guestDrawerItems as GuestDrawerItem[] | undefined,
            placedCatalogItemIds,
            onToggleMode: handlers.handleModeToggle,
            onShareClick: () => roomState.setIsShareModalOpen(true),
            onDeleteItem: handlers.handleDeleteItem,
            onTouchPlaceItem: handlers.handlePlaceCatalogItem
                ? (catalogItemId, event) => {
                      handlers.handlePlaceCatalogItem(catalogItemId, event.clientX, event.clientY);
                  }
                : undefined,
        };

        const computer: RoomOverlaysProps["computer"] = {
            isOpen: roomState.isComputerOpen,
            onClose: () => roomState.setIsComputerOpen(false),
            shortcuts: roomState.localShortcuts,
            onUpdateShortcuts: handlers.handleUpdateShortcuts,
            economy: {
                userCurrency: economy.userCurrency,
                nextRewardAt: economy.effectiveNextRewardAt,
                loginStreak: economy.effectiveLoginStreak,
                guestCoins: roomState.guestCoinsValue,
                onGuestCoinsChange: economy.updateGuestCoins,
                startingCoins: economy.startingCoins,
                guestInventory: roomState.guestInventoryValue as Id<"catalogItems">[],
                onGuestPurchase: (itemId: Id<"catalogItems">) => {
                    economy.updateGuestInventory((prev) => [...prev, itemId]);
                },
            },
            profile: {
                displayName: isGuest ? undefined : computed.computedDisplayName,
                username: isGuest ? undefined : computed.computedUsername,
                onDisplayNameUpdated: (next) => roomState.setDisplayNameValue(next),
                cursorColor: profile.cursorColor,
                onCursorColorChange: profile.handleCursorColorChange,
            },
            time: {
                timeOfDay: computed.timeOfDay,
                devTimeOfDay: computed.overrideTimeOfDay,
                onSetDevTimeOfDay: time.setOverrideTimeOfDay,
            },
            onboardingCallbacks: {
                onShopOpened: () => {
                    if (onboarding.onboardingStep === "open-shop") {
                        onboarding.advanceOnboarding();
                    }
                },
                onOnboardingPurchase: () => {
                    if (onboarding.onboardingStep === "buy-item") {
                        onboarding.advanceOnboarding();
                    }
                },
                isOnboardingShopStep: onboarding.onboardingStep === "open-shop",
                onOnboardingShortcutAdded: () => {
                    if (onboarding.onboardingStep === "add-shortcut") {
                        onboarding.advanceOnboarding();
                    }
                },
                highlightFirstMusicItem: computed.shouldHighlightMusicPurchase,
            },
            onPointerMove: handlers.handleCursorMove,
        };

        const music: RoomOverlaysProps["music"] = {
            musicPlayerItemId: roomState.musicPlayerItemId,
            localItems,
            musicInteractionToken: roomState.musicInteractionToken,
            onSave: async (updatedItem, updatedItems) => {
                roomState.setLocalItems(() => updatedItems);

                if (updatedItem.musicUrl && updatedItem.musicPlaying) {
                    roomState.setMusicInteractionToken(Date.now());
                }

                if (!isGuest && room) {
                    await saveRoom({ roomId: room._id, items: updatedItems });
                }
            },
            onClose: () => roomState.setMusicPlayerItemId(null),
        };

        const onboardingProps: RoomOverlaysProps["onboarding"] = {
            active: onboarding.onboardingActive,
            step: onboarding.onboardingStep,
            onAdvance: onboarding.advanceOnboarding,
            onComplete: onboarding.handleOnboardingComplete,
            dailyRewardToast: toasts.dailyRewardToast,
            stripeSuccessToast: toasts.showStripeSuccessToast,
            onCloseStripeSuccessToast: () => toasts.setShowStripeSuccessToast(false),
            friendRefToast: toasts.friendRefToast,
            onCloseFriendRefToast: () => toasts.setFriendRefToast(null),
        };

        const presenceProps: RoomOverlaysProps["presence"] = {
            hasVisitors: presence.hasVisitors,
            isComputerOpenState: roomState.isComputerOpen,
            isShareModalOpen: roomState.isShareModalOpen,
            onCloseShareModal: () => roomState.setIsShareModalOpen(false),
            updateChatMessage: presence.updateChatMessage,
            localChatMessage: presence.localChatMessage,
            screenCursor: presence.screenCursor,
            connectionState: presence.connectionState,
            activeInvites: presence.activeInvites,
            visitors: presence.visitors,
        };

        let gameType: GameType | null = null;
        if (game.activeGameItemId && catalogItems) {
            const roomItem = localItems.find((i) => i.id === game.activeGameItemId);
            if (roomItem) {
                const catalogItem = catalogItems.find((c) => c._id === roomItem.catalogItemId);
                gameType = catalogItem?.gameType ?? null;
            }
        }

        const gameProps: RoomOverlaysProps["game"] = {
            activeGameItemId: game.activeGameItemId,
            gameType,
            onClose: () => game.setActiveGameItemId(null),
            onGameActiveChange: game.handleGameActiveChange,
            visitorId: game.visitorId,
            visitors: presence.visitors,
            setGameMetadata: game.setGameMetadata,
        };

        return {
            ui,
            computer,
            music,
            onboarding: onboardingProps,
            presence: presenceProps,
            game: gameProps,
        };
    }, [
        isGuest,
        roomState,
        computed,
        handlers,
        localItems,
        catalogItems,
        placedCatalogItemIds,
        layout,
        onboarding,
        presence,
        economy,
        profile,
        time,
        toasts,
        game,
        room,
        saveRoom,
    ]);
}
