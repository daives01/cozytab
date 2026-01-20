import { useMutation, useQuery } from "convex/react";
import type { Id } from "@convex/_generated/dataModel";
import { api } from "@convex/_generated/api";
import { useState, useRef, useCallback, useEffect, useMemo, type DragEvent } from "react";
import type { RoomItem, ComputerShortcut } from "@/types";
import { useOnboarding } from "./hooks/useOnboarding";
import { useDailyReward } from "./hooks/useDailyReward";
import type { DailyRewardToastPayload } from "./types";
import { useUser } from "@clerk/clerk-react";
import type React from "react";
import { useRoomScale } from "./hooks/useRoomScale";
import { useCozyCursor } from "./hooks/useCozyCursor";
import { useCursorColor } from "./hooks/useCursorColor";
import { ROOM_HEIGHT, ROOM_WIDTH } from "@/time/roomConstants";
import { useDrawerLayout } from "./hooks/useDrawerLayout";
import { clearGuestSession } from "@/guest/guestSession";
import { useRoomData } from "./hooks/useRoomData";
import { usePresenceAndChat } from "@/presence/usePresenceChat";
import { useTimeOfDayControls } from "@/hooks/useTimeOfDayControls";
import { useRoomState } from "./hooks/useRoomState";
import { useRoomHandlers } from "./hooks/useRoomHandlers";
import { useRoomComputed } from "./hooks/useRoomComputed";
import { useRoomGate } from "./hooks/useRoomGate";
import { usePlacementAllowance } from "./hooks/usePlacementAllowance";
import { RoomItemsLayer } from "./components/RoomItemsLayer";
import { RoomOverlays } from "./components/RoomOverlays";
import { RoomCanvas } from "./RoomCanvas";
import { GUEST_STARTING_COINS, type GuestSessionState } from "@shared/guestTypes";
import { useAudioUnlock } from "@/lib/audio";
import { RoomStateProvider } from "./state/roomAtoms";
import {
    useCursorColorSaver,
    useGuestBootstrap,
    useReconcileGuestOnboarding,
    useOwnerPresenceCursorSync,
    useDebouncedRoomSave,
    useEnsureRoomLoaded,
    useLeaseHeartbeat,
    useSyncComputerState,
    useViewportSize,
    useDailyRewardToastTimer,
    useOnboardingAssetPrefetch,
} from "./hooks/useRoomPageEffects";

const MOBILE_MAX_WIDTH = 640;

interface RoomPageProps {
    isGuest?: boolean;
    guestSession?: GuestSessionState;
}

export function RoomPage(props: RoomPageProps) {
    if (props.isGuest) {
        return <RoomPageContent {...props} />;
    }

    return (
        <RoomStateProvider storeKey="room-owner">
            <RoomPageContent {...props} />
        </RoomStateProvider>
    );
}

function RoomPageContent({ isGuest = false, guestSession }: RoomPageProps) {
    const { user: clerkUser } = useUser();
    useAudioUnlock();
    const { timeOfDay, overrideTimeOfDay, setOverrideTimeOfDay } = useTimeOfDayControls();
    const {
        room,
        guestTemplate,
        guestRoom,
        user,
        catalogItems,
        computerState,
        roomBackgroundImageUrl,
        resolvedComputerAssetUrl,
    } = useRoomData({ isGuest, timeOfDay });
    const inventoryWithCounts = useQuery(api.inventory.getMyInventory, isGuest ? "skip" : {});
    const {
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
    } = useRoomState({ isGuest, guestSession, catalogItems });

    const normalizedInitialGuestSession = initialGuestSession;
    const normalizedLocalItems = localItems as RoomItem[];
    const setNormalizedItems = setLocalItems as (updater: RoomItem[] | ((prev: RoomItem[]) => RoomItem[])) => void;
    const placedCatalogItemIds = useMemo(() => normalizedLocalItems.map((item) => item.catalogItemId), [normalizedLocalItems]);
    const { canPlace: canPlaceItem } = usePlacementAllowance({
        isGuest,
        placedCatalogItemIds,
        guestInventoryIds: guestInventoryValue as Id<"catalogItems">[],
        inventoryItems: inventoryWithCounts,
        inventoryLoading: inventoryWithCounts === undefined,
    });
    const createRoom = useMutation(api.rooms.createRoom);
    const saveRoom = useMutation(api.rooms.saveMyRoom);
    const heartbeatInvite = useMutation(api.rooms.heartbeatInvite);
    const closeInviteSession = useMutation(api.rooms.closeInviteSession);
    const activeInvites = useQuery(api.invites.getMyActiveInvites, isGuest ? "skip" : {});
    const activeInviteCode = !isGuest ? activeInvites?.[0]?.code ?? null : null;
    const inviteLoading = !isGuest && activeInvites === undefined;
    const saveComputer = useMutation(api.users.saveMyComputer);
    const claimDailyReward = useMutation(api.users.claimDailyReward);
    const completeOnboarding = useMutation(api.users.completeOnboarding);
    const { width: viewportWidth, height: viewportHeight } = useViewportSize();
    const scale = useRoomScale(ROOM_WIDTH, ROOM_HEIGHT, {
        viewportWidth,
        viewportHeight,
        maxScale: 1.25,
    });
    const [dailyRewardToast, setDailyRewardToast] = useState<DailyRewardToastPayload | null>(null);
    const [showStripeSuccessToast, setShowStripeSuccessToast] = useState(() => {
        if (typeof window === "undefined") return false;
        const params = new URLSearchParams(window.location.search);
        return params.get("success") === "stripe";
    });
    const containerRef = useRef<HTMLDivElement | null>(null);
    const lastRoomPositionRef = useRef({ x: ROOM_WIDTH / 2, y: ROOM_HEIGHT / 2 });
    const computerPrefetchedRef = useRef(false);
    const reconciledGuestOnboarding = useRef(false);

    useCozyCursor(true);
    const cursorColor =
        (isGuest ? guestCursorColor : authedCursorColor ?? user?.cursorColor ?? computerState?.cursorColor) ??
        "var(--chart-4)";
    useCursorColor(cursorColor);

    useEffect(() => {
        if (isGuest) return;
        if (inviteLoading) return;
        if (typeof window === "undefined") return;

        const desiredPath = activeInviteCode ? `/visit/${activeInviteCode}` : "/";
        const currentPath = window.location.pathname;

        if (currentPath !== desiredPath) {
            window.history.replaceState(window.history.state, "", desiredPath);
        }
    }, [activeInviteCode, inviteLoading, isGuest]);

    useCursorColorSaver(saveComputer, authedShortcutsRef, saveAuthedCursorColorRef);

    const { orientation: drawerOrientation, drawerInsetLeft, drawerInsetBottom, toolbarOffset } = useDrawerLayout(
        isDrawerOpen,
        viewportWidth,
        viewportHeight
    );

    const markGuestOnboardingComplete = useCallback(() => {
        setGuestOnboardingCompletedValue(true);
    }, [setGuestOnboardingCompletedValue]);

    const updateGuestCoins = useCallback(
        (next: number | ((prev: number) => number)) => setGuestCoinsValue(next),
        [setGuestCoinsValue]
    );

    const updateGuestInventory = useCallback(
        (updater: (prev: Id<"catalogItems">[]) => Id<"catalogItems">[]) => {
            (setGuestInventoryValue as unknown as (fn: (prev: Id<"catalogItems">[]) => Id<"catalogItems">[]) => void)(
                updater
            );
        },
        [setGuestInventoryValue]
    );

    const updateGuestShortcuts = useCallback(
        (next: ComputerShortcut[]) => setLocalShortcuts(next),
        [setLocalShortcuts]
    );

    const handleCursorColorChange = useCallback(
        (next: string) => {
            const color = next?.trim();
            if (!color) return;
            if (isGuest) {
                setGuestCursorColor(color);
            } else {
                setAuthedCursorColor(color);
                saveAuthedCursorColorRef.current?.(color);
            }
        },
        [isGuest, saveAuthedCursorColorRef, setAuthedCursorColor, setGuestCursorColor]
    );

    useGuestBootstrap({
        isGuest,
        guestSessionLoadedRef,
        initialGuestSession: normalizedInitialGuestSession,
        guestRoomItems: guestRoom?.items as RoomItem[] | undefined,
        guestTemplateItems: (guestTemplate as { items?: RoomItem[] } | null | undefined)?.items,
        setLocalItems: setNormalizedItems,
    });

    useReconcileGuestOnboarding({
        isGuest,
        reconciledGuestOnboardingRef: reconciledGuestOnboarding,
        user,
        initialGuestSession,
        completeOnboarding,
        clearGuestSession,
    });

    const visitorId = clerkUser?.id ?? null;
    const ownerName = user?.displayName ?? user?.username ?? "Me";
    const presenceRoomId = !isGuest && room && visitorId ? room._id : null;
    const {
        visitors,
        updateCursor,
        updateChatMessage,
        screenCursor,
        localChatMessage,
        hasVisitors,
        visitorCount,
        setInMenu,
        setInGame,
        connectionState,
        wsRef,
    } = usePresenceAndChat({
        roomId: presenceRoomId,
        identity: { id: visitorId ?? "owner", name: ownerName, cursorColor },
        isOwner: true,
    });

    const [activeGameItemId, setActiveGameItemId] = useState<string | null>(null);

    const isInMenu = isComputerOpen || Boolean(musicPlayerItemId) || Boolean(activeGameItemId);
    useEffect(() => {
        setInMenu(isInMenu);
    }, [isInMenu, setInMenu]);

    const handleGameActiveChange = useCallback((gameItemId: string | null) => {
        setInGame(gameItemId);
    }, [setInGame]);

    useOwnerPresenceCursorSync({ isGuest, updateCursor, screenCursor, hasVisitors, lastRoomPositionRef });

    useDebouncedRoomSave({ isGuest, mode, room, localItems: normalizedLocalItems, saveRoom });

    useEnsureRoomLoaded({
        room,
        isGuest,
        setLocalItems: (items) => setNormalizedItems(items),
        createRoom: () => createRoom({}),
    });

    useLeaseHeartbeat({
        isGuest,
        room,
        heartbeatInvite,
        closeInviteSession,
        hasVisitors,
        currentUserId: user?._id ?? null,
        isSharingActive: !!activeInvites?.length,
    });

    useSyncComputerState({
        isGuest,
        computerState,
        setLocalShortcuts,
        setAuthedCursorColor,
        userCursorColor: user?.cursorColor,
    });

    const dailyRewardInfo = useDailyReward({
        user,
        isGuest,
        claimDailyReward,
        onReward: ({ awardedAt, loginStreak }) => {
            setDailyRewardToast({ awardedAt, loginStreak });
        },
    });

    const effectiveLoginStreak = dailyRewardInfo.loginStreak ?? user?.loginStreak;
    const effectiveNextRewardAt = dailyRewardInfo.nextRewardAt;

    useDailyRewardToastTimer(dailyRewardToast, setDailyRewardToast);

    useEffect(() => {
        if (typeof window === "undefined") return;
        const params = new URLSearchParams(window.location.search);
        if (params.get("success") === "stripe") {
            const newUrl = new URL(window.location.href);
            newUrl.searchParams.delete("success");
            window.history.replaceState({}, "", newUrl.pathname + newUrl.search);
        }
    }, []);

    useEffect(() => {
        if (!showStripeSuccessToast) return;
        const timer = window.setTimeout(() => setShowStripeSuccessToast(false), 5000);
        return () => window.clearTimeout(timer);
    }, [showStripeSuccessToast]);

    const { onboardingStep, onboardingActive, advanceOnboarding, handleOnboardingComplete } = useOnboarding({
        user,
        isGuest,
        completeOnboarding,
        guestOnboardingCompleted: guestOnboardingCompletedValue,
        markGuestOnboardingComplete,
    });

    const computed = useRoomComputed({
        catalogItems,
        guestInventoryValue,
        placedCatalogItemIds,
        userDisplayName: user?.displayName,
        userUsername: user?.username,
        clerkUsername: clerkUser?.username,
        displayNameValue,
        onboardingStep,
        timeOfDay,
        overrideTimeOfDay,
        isGuest,
    });

    useOnboardingAssetPrefetch(onboardingActive, resolvedComputerAssetUrl, computerPrefetchedRef);

    const handlers = useRoomHandlers({
        isGuest,
        mode,
        roomId: room?._id ?? null,
        containerRef,
        scale,
        lastRoomPositionRef,
        hasVisitors,
        onboardingStep,
        advanceOnboarding,
        computerGuardAllowOpen: computed.computerGuard.allowOpen,
        setLocalItems: setNormalizedItems,
        setSelectedId,
        setDraggedItemId,
        setIsComputerOpen,
        setMusicPlayerItemId,
        setIsDrawerOpen,
        setMode,
        updateCursor,
        saveRoom,
        updateGuestShortcuts,
        saveComputer,
        cursorColor,
        canPlaceItem,
    });
    const { handleModeToggle } = handlers;

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key !== "Escape") return;
            const target = event.target as HTMLElement | null;
            const isTypingTarget =
                target &&
                (target.tagName === "INPUT" ||
                    target.tagName === "TEXTAREA" ||
                    target.getAttribute("contenteditable") === "true");
            if (isTypingTarget) return;
            if (mode === "edit") {
                event.preventDefault();
                handleModeToggle();
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [handleModeToggle, mode]);

    const handleDragOver = (e: DragEvent) => {
        e.preventDefault();
    };

    const handleMouseEvent = (e: React.MouseEvent) => {
        handlers.handleCursorMove(e.clientX, e.clientY);
    };

    const gate = useRoomGate({
        isGuest,
        viewportWidth,
        mobileMaxWidth: MOBILE_MAX_WIDTH,
        initialGuestSession: normalizedInitialGuestSession ?? initialGuestSession,
        room,
        guestTemplate,
        guestRoom,
    });

    if (gate) return gate;

    const roomContent = (
        <RoomItemsLayer
            items={normalizedLocalItems}
            selectedId={selectedId}
            mode={mode}
            scale={scale}
            onSelect={(id) => handlers.handleSelectItem(id)}
            onChange={(newItem) => handlers.handleChangeItem(newItem)}
            onDragStart={(id) => handlers.handleDragStart(id)}
            onDragEnd={() => handlers.handleDragEnd()}
            onComputerClick={() => handlers.handleComputerClick()}
            onMusicPlayerClick={(id) => handlers.handleMusicPlayerClick(id)}
            onGameClick={(id) => setActiveGameItemId(id)}
            bringItemToFront={(id) => handlers.handleBringToFront(id)}
            sendItemToBack={(id) => handlers.handleSendToBack(id)}
            onboardingStep={onboardingStep}
            handleMusicToggle={handlers.handleMusicToggle}
            musicAutoplay={musicAutoplay}
            presenceRoomId={presenceRoomId}
            visitors={visitors}
            visitorId={visitorId}
            isGuest={isGuest}
            currentGameId={activeGameItemId}
        />
    );

    const overlays = (
        <RoomOverlays
            isGuest={isGuest}
            mode={mode}
            shareAllowed={computed.shareAllowed}
            visitorCount={visitorCount}
            drawerOffset={toolbarOffset}
            drawerOrientation={drawerOrientation}
            isDrawerOpen={isDrawerOpen}
            draggedItemId={draggedItemId}
            highlightComputer={onboardingStep === "place-computer"}
            guestItems={computed.guestDrawerItems}
            placedCatalogItemIds={placedCatalogItemIds}
            onToggleMode={handlers.handleModeToggle}
            onShareClick={() => setIsShareModalOpen(true)}
            onDrawerToggle={handlers.handleDrawerToggle}
            onDeleteItem={(itemId) => {
                setNormalizedItems((prev: RoomItem[]) => prev.filter((item: RoomItem) => item.id !== itemId));
                setSelectedId((current) => (current === itemId ? null : current));
            }}
            isComputerOpen={isComputerOpen}
            onCloseComputer={() => setIsComputerOpen(false)}
            shortcuts={localShortcuts}
            onUpdateShortcuts={(shortcuts) => handlers.handleUpdateShortcuts(shortcuts)}
            userCurrency={user?.currency ?? guestCoinsValue ?? 0}
            nextRewardAt={effectiveNextRewardAt ?? undefined}
            loginStreak={effectiveLoginStreak ?? undefined}
            onShopOpened={() => {
                if (onboardingStep === "open-shop") {
                    advanceOnboarding();
                }
            }}
            onOnboardingPurchase={() => {
                if (onboardingStep === "buy-item") {
                    advanceOnboarding();
                }
            }}
            isOnboardingShopStep={onboardingStep === "open-shop"}
            onPointerMove={(x, y) => handlers.handleCursorMove(x, y)}
            guestCoins={guestCoinsValue}
            onGuestCoinsChange={(coins) => updateGuestCoins(coins)}
            startingCoins={GUEST_STARTING_COINS}
            guestInventory={guestInventoryValue as Id<"catalogItems">[]}
            onGuestPurchase={(itemId: Id<"catalogItems">) => {
                updateGuestInventory((prev) => [...prev, itemId]);
            }}
            onOnboardingShortcutAdded={() => {
                if (onboardingStep === "add-shortcut") {
                    advanceOnboarding();
                }
            }}
            highlightFirstMusicItem={computed.shouldHighlightMusicPurchase}
            displayName={isGuest ? undefined : computed.computedDisplayName}
            username={isGuest ? undefined : computed.computedUsername}
            onDisplayNameUpdated={(next) => setDisplayNameValue(next)}
            cursorColor={cursorColor}
            onCursorColorChange={handleCursorColorChange}
            timeOfDay={computed.timeOfDay}
            devTimeOfDay={computed.overrideTimeOfDay}
            onSetDevTimeOfDay={setOverrideTimeOfDay}
            musicPlayerItemId={musicPlayerItemId}
            localItems={normalizedLocalItems}
            onMusicSave={async (updatedItem, updatedItems) => {
                setNormalizedItems(() => updatedItems);

                if (updatedItem.musicUrl) {
                    setMusicAutoplay({ itemId: updatedItem.id, token: `${updatedItem.id}-${Date.now()}` });
                }

                if (!isGuest && room) {
                    await saveRoom({ roomId: room._id, items: updatedItems });
                }
            }}
            onCloseMusic={() => setMusicPlayerItemId(null)}
            onboardingActive={onboardingActive}
            onboardingStep={onboardingStep}
            onAdvanceOnboarding={advanceOnboarding}
            onCompleteOnboarding={handleOnboardingComplete}
            dailyRewardToast={dailyRewardToast}
            stripeSuccessToast={showStripeSuccessToast}
            onCloseStripeSuccessToast={() => setShowStripeSuccessToast(false)}
            hasVisitors={hasVisitors}
            isComputerOpenState={isComputerOpen}
            isShareModalOpen={isShareModalOpen}
            onCloseShareModal={() => setIsShareModalOpen(false)}
            updateChatMessage={updateChatMessage}
            localChatMessage={localChatMessage}
            screenCursor={screenCursor}
            connectionState={connectionState}
            activeGameItemId={activeGameItemId}
            onCloseGame={() => setActiveGameItemId(null)}
            onGameActiveChange={handleGameActiveChange}
            gameIdentity={{ id: visitorId ?? "owner", displayName: ownerName, cursorColor }}
            wsRef={wsRef}
            visitors={visitors}
        />
    );

    return (
        <div className="h-screen w-screen">
            <RoomCanvas
                roomBackgroundImageUrl={roomBackgroundImageUrl ?? undefined}
                scale={scale}
                timeOfDay={timeOfDay}
                containerRef={containerRef}
                onDragOver={handleDragOver}
                onDrop={handlers.handleDrop}
                onMouseMove={handleMouseEvent}
                onMouseEnter={handleMouseEvent}
                onBackgroundClick={() => handlers.handleBackgroundClick()}
                outerClassName={draggedItemId ? "select-none" : ""}
                outerStyle={{
                    paddingLeft: drawerInsetLeft,
                    paddingBottom: drawerInsetBottom,
                    transition: "padding 300ms cubic-bezier(0.4, 0, 0.2, 1)",
                }}
                roomContent={roomContent}
                overlays={overlays}
            />
        </div>
    );
}
