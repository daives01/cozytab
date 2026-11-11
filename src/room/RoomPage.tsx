import { RoomSaveFeedback } from "./components/RoomSaveFeedback";
import { useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import type { Id } from "@convex/_generated/dataModel";
import { api } from "@convex/_generated/api";
import { useState, useRef, useCallback, useEffect, useMemo, type DragEvent } from "react";
import type { Shortcut } from "@shared/guestTypes";
import { useOnboarding } from "./hooks/useOnboarding";
import { useDailyReward } from "./hooks/useDailyReward";
import type { DailyRewardToastPayload } from "./types";
import { useUser } from "@clerk/clerk-react";
import type React from "react";
import { useCozyCursor } from "./hooks/useCozyCursor";
import { useCursorColor } from "./hooks/useCursorColor";
import { useRoomViewportScale } from "./hooks/useRoomViewportScale";
import { useMobileZoom } from "./hooks/useMobileZoom";
import { MobileZoomButton } from "./components/MobileZoomButton";
import { ROOM_HEIGHT, ROOM_WIDTH } from "@/time/roomConstants";
import { useDrawerLayout } from "./hooks/useDrawerLayout";
import { clearGuestSession, readGuestSession } from "@/guest/guestSession";
import { useRoomData } from "./hooks/useRoomData";
import { usePresenceAndChat } from "@/presence/usePresenceChat";
import { useTimeOfDayControls } from "@/hooks/useTimeOfDayControls";
import { useRoomState } from "./hooks/useRoomState";
import { useRoomHandlers } from "./hooks/useRoomHandlers";
import { useRoomComputed } from "./hooks/useRoomComputed";
import { useRoomGate } from "./hooks/useRoomGate";
import type { RoomOverlaysProps } from "./components/RoomOverlays.types";
import type { GameType } from "@shared/categories";
import type { RoomItem } from "@shared/guestTypes";
import { useTouchPlacement } from "./hooks/useTouchPlacement";
import { RoomItemsLayer } from "./components/RoomItemsLayer";
import { RoomOverlays } from "./components/RoomOverlays";
import { RoomExperience } from "./components/RoomExperience";
import { GUEST_STARTING_COINS, type GuestSessionState } from "@shared/guestTypes";
import { useAudioUnlock } from "@/lib/audio";
import { createAuthenticatedRoomPersistence, createGuestRoomPersistence, RoomSessionProvider } from "./session";
import { addInventoryCounts, countIds } from "./utils/itemCounts";
import {
    useCursorColorSaver,
    useReconcileGuestOnboarding,
    useOwnerPresenceCursorSync,
    useEnsureRoomLoaded,
    useLeaseHeartbeat,
    useSyncComputerState,
    useDailyRewardToastTimer,
    useOnboardingAssetPrefetch,
    useEscapeToExitEditMode,
} from "./hooks/useRoomPageEffects";

interface RoomPageProps {
    isGuest?: boolean;
    guestSession?: GuestSessionState;
    friendRefCode?: string | null;
}

export function RoomPage(props: RoomPageProps) {
    return <RoomPageContent {...props} />;
}

function RoomPageContent({ isGuest = false, guestSession, friendRefCode }: RoomPageProps) {
    const timeControls = useTimeOfDayControls();
    const roomData = useRoomData({ isGuest, timeOfDay: timeControls.timeOfDay });
    const inventoryWithCounts = useQuery(api.inventory.getMyInventory, isGuest ? "skip" : {});
    const saveRoom = useMutation(api.rooms.saveMyRoom);
    const loadedGuestSession = useMemo(() => guestSession ?? readGuestSession(), [guestSession]);

    const initialGuestItems = useMemo(
        () =>
            loadedGuestSession.roomItems.length > 0 ? loadedGuestSession.roomItems : (roomData.guestRoom?.items ?? []),
        [loadedGuestSession, roomData.guestRoom],
    );

    const persistence = useMemo(() => {
        if (isGuest) {
            return createGuestRoomPersistence({
                loadSession: () => ({ ...loadedGuestSession, roomItems: initialGuestItems }),
            });
        }

        return createAuthenticatedRoomPersistence({
            roomId: roomData.room?._id,
            initialItems: roomData.room?.items ?? [],
            saveItems: async (items) => await saveRoom({ roomId: roomData.room!._id, items }),
        });
    }, [initialGuestItems, isGuest, loadedGuestSession, roomData.room, saveRoom]);

    const ownedCounts = useMemo(() => {
        if (isGuest) return countIds(loadedGuestSession.inventoryIds);

        if (inventoryWithCounts === undefined) return null;

        return addInventoryCounts(inventoryWithCounts);
    }, [inventoryWithCounts, isGuest, loadedGuestSession.inventoryIds]);

    const ownedCount = useCallback(
        (catalogItemId: Id<"catalogItems">) => {
            if (isGuest) return countIds(readGuestSession().inventoryIds).get(String(catalogItemId)) ?? 0;

            if (ownedCounts === null) return 0;

            return ownedCounts.get(String(catalogItemId)) ?? 0;
        },
        [isGuest, ownedCounts],
    );

    const roomIdentity = isGuest
        ? "guest-owner"
        : String(roomData.room?._id ?? (roomData.room === undefined ? "authenticated-loading" : "authenticated-empty"));

    if (isGuest && (roomData.guestRoom === undefined || roomData.guestTemplate === undefined)) {
        return (
            <div className="h-screen w-screen flex items-center justify-center font-['Patrick_Hand'] text-size-xl">
                Loading your cozytab...
            </div>
        );
    }

    return (
        <RoomSessionProvider key={roomIdentity} roomId={roomIdentity} persistence={persistence} ownedCount={ownedCount}>
            <RoomPageOwner
                isGuest={isGuest}
                guestSession={guestSession}
                friendRefCode={friendRefCode}
                roomData={roomData}
                timeControls={timeControls}
            />
        </RoomSessionProvider>
    );
}

function RoomPageOwner({
    isGuest,
    guestSession,
    friendRefCode,
    roomData,
    timeControls,
}: RoomPageProps & {
    isGuest: boolean;
    roomData: ReturnType<typeof useRoomData>;
    timeControls: ReturnType<typeof useTimeOfDayControls>;
}) {
    const { user: clerkUser } = useUser();
    useAudioUnlock();
    const { timeOfDay, overrideTimeOfDay, setOverrideTimeOfDay } = timeControls;

    const {
        room,
        guestTemplate,
        guestRoom,
        user,
        catalogItems,
        computerState,
        roomBackgroundImageUrl,
        resolvedComputerAssetUrl,
    } = roomData;

    const roomState = useRoomState({ isGuest, guestSession, catalogItems });

    const localItems = roomState.localItems;
    const createRoom = useMutation(api.rooms.createRoom);
    const heartbeatInvite = useMutation(api.rooms.heartbeatInvite);
    const closeInviteSession = useMutation(api.rooms.closeInviteSession);
    const activeInvites = useQuery(api.invites.getMyActiveInvites, isGuest ? "skip" : {});
    const activeInviteCode = !isGuest ? (activeInvites?.[0]?.code ?? null) : null;
    const inviteLoading = !isGuest && activeInvites === undefined;
    const saveComputer = useMutation(api.users.saveMyComputer);
    const claimDailyReward = useMutation(api.users.claimDailyReward);
    const completeOnboarding = useMutation(api.users.completeOnboarding);
    const { viewportWidth, viewportHeight, scale } = useRoomViewportScale();

    const {
        zoomLevel,
        zoomLabel,
        isZoomed,
        panOffset,
        effectiveScale,
        cycleZoom,
        handlePanStart,
        handlePanMove,
        handlePanEnd,
    } = useMobileZoom({ baseScale: scale, viewportWidth, viewportHeight });

    const [dailyRewardToast, setDailyRewardToast] = useState<DailyRewardToastPayload | null>(null);

    const [showStripeSuccessToast, setShowStripeSuccessToast] = useState(() => {
        if (typeof window === "undefined") return false;
        const params = new URLSearchParams(window.location.search);

        return params.get("success") === "stripe";
    });

    const [friendRefToast, setFriendRefToast] = useState<{ message: string; tone: "success" | "default" } | null>(null);
    const sendFriendRequest = useMutation(api.friends.sendFriendRequest);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const lastRoomPositionRef = useRef({ x: ROOM_WIDTH / 2, y: ROOM_HEIGHT / 2 });
    const computerPrefetchedRef = useRef(false);
    const reconciledGuestOnboarding = useRef(false);

    useCozyCursor(true);

    const cursorColor =
        (isGuest
            ? roomState.guestCursorColor
            : (roomState.authedCursorColor ?? user?.cursorColor ?? computerState?.cursorColor)) ?? "var(--chart-4)";

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

    useCursorColorSaver(saveComputer, roomState.authedShortcutsRef, roomState.saveAuthedCursorColorRef);

    const {
        orientation: drawerOrientation,
        drawerInsetLeft,
        drawerInsetBottom,
        toolbarOffset,
    } = useDrawerLayout(roomState.isDrawerOpen, viewportWidth, viewportHeight);

    const markGuestOnboardingComplete = useCallback(() => {
        roomState.setGuestOnboardingCompletedValue(true);
    }, [roomState]);

    const updateGuestShortcuts = useCallback((next: Shortcut[]) => roomState.setLocalShortcuts(next), [roomState]);

    const handleCursorColorChange = useCallback(
        (next: string) => {
            const color = next?.trim();

            if (!color) return;

            if (isGuest) {
                roomState.setGuestCursorColor(color);
            } else {
                roomState.setAuthedCursorColor(color);
                roomState.saveAuthedCursorColorRef.current?.(color);
            }
        },
        [isGuest, roomState],
    );

    useReconcileGuestOnboarding({
        isGuest,
        reconciledGuestOnboardingRef: reconciledGuestOnboarding,
        user,
        initialGuestSession: roomState.initialGuestSession,
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
        setGameMetadata,
        connectionState,
        connectionError,
    } = usePresenceAndChat({
        roomId: presenceRoomId,
        identity: { id: visitorId ?? "owner", name: ownerName, cursorColor, convexUserId: user?._id },
        isOwner: true,
    });

    const [activeGameItemId, setActiveGameItemId] = useState<string | null>(null);

    const isInMenu = roomState.isComputerOpen || Boolean(roomState.musicPlayerItemId) || Boolean(activeGameItemId);
    useEffect(() => {
        setInMenu(isInMenu);
    }, [isInMenu, setInMenu]);

    useOwnerPresenceCursorSync({ isGuest, updateCursor, screenCursor, hasVisitors, lastRoomPositionRef });

    useEnsureRoomLoaded({
        room,
        isGuest,
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
        setLocalShortcuts: roomState.setLocalShortcuts,
        setAuthedCursorColor: roomState.setAuthedCursorColor,
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

    // Handle ?friendRef= code: send friend request if logged in, or prompt to sign up
    // Use sessionStorage to persist handled state across HMR/strict mode remounts
    useEffect(() => {
        if (!friendRefCode) return;

        const storageKey = `friendRef_handled_${friendRefCode}`;

        if (sessionStorage.getItem(storageKey)) return;

        if (isGuest) {
            sessionStorage.setItem(storageKey, "guest");
            queueMicrotask(() => {
                setFriendRefToast({ message: "Create an account to add your friend!", tone: "default" });
            });

            return;
        }

        // Mark as in-progress to prevent duplicate requests
        sessionStorage.setItem(storageKey, "pending");

        sendFriendRequest({ friendCode: friendRefCode })
            .then((result) => {
                sessionStorage.setItem(storageKey, "done");

                if (result.alreadyFriends) {
                    setFriendRefToast({ message: "You're already friends!", tone: "success" });
                } else if (result.alreadyPending) {
                    setFriendRefToast({ message: "Friend request already sent!", tone: "success" });
                } else if (result.autoAccepted) {
                    setFriendRefToast({ message: "You're now friends!", tone: "success" });
                } else {
                    setFriendRefToast({ message: "Friend request sent!", tone: "success" });
                }
            })
            .catch((err) => {
                // Clear on failure so user can retry
                sessionStorage.removeItem(storageKey);
                const msg = err instanceof ConvexError ? err.data : "Failed to send friend request";
                setFriendRefToast({ message: msg, tone: "default" });
            });
    }, [friendRefCode, isGuest, sendFriendRequest]);

    useEffect(() => {
        if (!friendRefToast) return;
        const timer = window.setTimeout(() => setFriendRefToast(null), 5000);

        return () => window.clearTimeout(timer);
    }, [friendRefToast]);

    const { onboardingStep, onboardingActive, advanceOnboarding, handleOnboardingComplete } = useOnboarding({
        user,
        isGuest,
        completeOnboarding,
        guestOnboardingCompleted: roomState.guestOnboardingCompletedValue,
        markGuestOnboardingComplete,
    });

    const computed = useRoomComputed({
        catalogItems,
        guestInventoryValue: roomState.guestInventoryValue,
        placementEligibility: roomState.editingSession.placementEligibility,
        userDisplayName: user?.displayName,
        userUsername: user?.username,
        clerkUsername: clerkUser?.username,
        displayNameValue: roomState.displayNameValue,
        onboardingStep,
        timeOfDay,
        overrideTimeOfDay,
        isGuest,
    });

    useOnboardingAssetPrefetch(onboardingActive, resolvedComputerAssetUrl, computerPrefetchedRef);

    const handlers = useRoomHandlers({
        isGuest,
        mode: roomState.mode,
        editingSession: roomState.editingSession,
        containerRef,
        scale: effectiveScale,
        lastRoomPositionRef,
        hasVisitors,
        onboardingStep,
        advanceOnboarding,
        computerGuardAllowOpen: computed.computerGuard.allowOpen,
        setIsComputerOpen: roomState.setIsComputerOpen,
        setMusicPlayerItemId: roomState.setMusicPlayerItemId,
        setIsDrawerOpen: roomState.setIsDrawerOpen,
        updateCursor,
        updateGuestShortcuts,
        saveComputer,
        cursorColor,
    });

    useEscapeToExitEditMode(roomState.mode, handlers.handleModeToggle);

    const handleDragOver = (e: DragEvent) => {
        e.preventDefault();
    };

    const handleMouseEvent = (e: React.MouseEvent) => {
        handlers.handleCursorMove(e.clientX, e.clientY);
    };

    const handlePointerEvent = (e: React.PointerEvent) => {
        if (e.pointerType !== "touch") return;
        handlers.handleCursorMove(e.clientX, e.clientY);

        if (isZoomed && roomState.mode === "view") {
            handlePanMove(e.clientX, e.clientY);
        }
    };

    const handlePointerDown = (e: React.PointerEvent) => {
        if (e.pointerType !== "touch") return;

        if (isZoomed && roomState.mode === "view") {
            handlePanStart(e.clientX, e.clientY);
        }
    };

    const handlePointerUp = useCallback(() => {
        handlePanEnd();
    }, [handlePanEnd]);

    const { touchPlacementId, handleTouchPlaceStart, handleTouchPlaceRoom, onTouchPlacementCancel } = useTouchPlacement(
        handlers,
        roomState,
    );

    const gate = useRoomGate({
        isGuest,
        initialGuestSession: roomState.initialGuestSession,
        room,
        guestTemplate,
        guestRoom,
    });

    const ui: RoomOverlaysProps["ui"] = {
        isGuest,
        mode: roomState.mode,
        shareAllowed: computed.shareAllowed,
        visitorCount: visitorCount,
        drawer: {
            offset: toolbarOffset,
            orientation: drawerOrientation,
            isOpen: roomState.isDrawerOpen,
            onToggle: handlers.handleDrawerToggle,
        },
        draggedItemId: roomState.draggedItemId,
        highlightComputer: onboardingStep === "place-computer",
        guestItems: computed.guestDrawerItems,
        placementEligibility: roomState.editingSession.placementEligibility,
        onToggleMode: handlers.handleModeToggle,
        onShareClick: () => roomState.setIsShareModalOpen(true),
        onDeleteItem: handlers.handleDeleteItem,
        onTouchPlaceItem: handleTouchPlaceStart,
        touchPlacementItemId: touchPlacementId,
        onTouchPlacementCancel,
    };

    const computer: RoomOverlaysProps["computer"] = {
        isOpen: roomState.isComputerOpen,
        onClose: () => roomState.setIsComputerOpen(false),
        shortcuts: roomState.localShortcuts,
        onUpdateShortcuts: handlers.handleUpdateShortcuts,
        economy: {
            userCurrency: user?.currency ?? roomState.guestCoinsValue ?? 0,
            nextRewardAt: effectiveNextRewardAt,
            loginStreak: effectiveLoginStreak,
            guestCoins: roomState.guestCoinsValue,
            onGuestCoinsChange: roomState.setGuestCoinsValue,
            startingCoins: GUEST_STARTING_COINS,
            guestInventory: roomState.guestInventoryValue,
            onGuestPurchase: (itemId: Id<"catalogItems">) => {
                roomState.setGuestInventoryValue((prev) => [...prev, itemId]);
            },
        },
        profile: {
            displayName: isGuest ? undefined : computed.computedDisplayName,
            username: isGuest ? undefined : computed.computedUsername,
            onDisplayNameUpdated: (next) => roomState.setDisplayNameValue(next),
            cursorColor: cursorColor,
            onCursorColorChange: handleCursorColorChange,
        },
        time: {
            timeOfDay: computed.timeOfDay,
            devTimeOfDay: computed.overrideTimeOfDay,
            onSetDevTimeOfDay: setOverrideTimeOfDay,
        },
        onboardingCallbacks: {
            onShopOpened: () => {
                if (onboardingStep === "open-shop") {
                    advanceOnboarding();
                }
            },
            onOnboardingPurchase: () => {
                if (onboardingStep === "buy-item") {
                    advanceOnboarding();
                }
            },
            isOnboardingShopStep: onboardingStep === "open-shop",
            onOnboardingShortcutAdded: () => {
                if (onboardingStep === "add-shortcut") {
                    advanceOnboarding();
                }
            },
            highlightFirstMusicItem: computed.shouldHighlightMusicPurchase,
        },
        onPointerMove: handlers.handleCursorMove,
        canSwitchRooms: roomState.canSwitchRooms,
        saveStatus: roomState.saveStatus,
        saveError: roomState.saveError,
        onRetrySave: () => roomState.editingSession.retrySave(),
    };

    const music: RoomOverlaysProps["music"] = {
        musicPlayerItemId: roomState.musicPlayerItemId,
        localItems,
        musicInteractionToken: roomState.musicInteractionToken,
        onSave: async (updatedItem) => {
            const changes: Partial<RoomItem> = { ...updatedItem };
            delete changes.id;
            delete changes.catalogItemId;
            const id = updatedItem.id;
            roomState.editingSession.changePersistedItem(id, changes, "visitor-observable");

            if (updatedItem.musicUrl && updatedItem.musicPlaying) {
                roomState.setMusicInteractionToken(Date.now());
            }
        },
        onClose: () => roomState.setMusicPlayerItemId(null),
    };

    const onboardingProps: RoomOverlaysProps["onboarding"] = {
        active: onboardingActive,
        step: onboardingStep,
        onAdvance: advanceOnboarding,
        onComplete: handleOnboardingComplete,
        dailyRewardToast: dailyRewardToast,
        stripeSuccessToast: showStripeSuccessToast,
        onCloseStripeSuccessToast: () => setShowStripeSuccessToast(false),
        friendRefToast: friendRefToast,
        onCloseFriendRefToast: () => setFriendRefToast(null),
    };

    const presenceProps: RoomOverlaysProps["presence"] = {
        hasVisitors: hasVisitors,
        isComputerOpenState: roomState.isComputerOpen,
        isShareModalOpen: roomState.isShareModalOpen,
        onCloseShareModal: () => roomState.setIsShareModalOpen(false),
        updateChatMessage: updateChatMessage,
        localChatMessage: localChatMessage,
        screenCursor: screenCursor,
        connectionState: connectionState,
        connectionError: connectionError,
        activeInvites: activeInvites,
        visitors: visitors,
    };

    let gameType: GameType | null = null;

    if (activeGameItemId && catalogItems) {
        const roomItem = localItems.find((i) => i.id === activeGameItemId);

        if (roomItem) {
            const catalogItem = catalogItems.find((c) => c._id === roomItem.catalogItemId);
            gameType = catalogItem?.gameType ?? null;
        }
    }

    const gameProps: RoomOverlaysProps["game"] = {
        activeGameItemId: activeGameItemId,
        gameType,
        onClose: () => setActiveGameItemId(null),
        onGameActiveChange: setInGame,
        visitorId: visitorId ?? "owner",
        visitors: visitors,
        setGameMetadata: setGameMetadata,
    };

    const overlaysModel: RoomOverlaysProps = {
        ui,
        computer,
        music,
        onboarding: onboardingProps,
        presence: presenceProps,
        game: gameProps,
    };

    if (gate) return gate;

    const roomContent = (
        <RoomItemsLayer
            items={localItems}
            catalogItems={catalogItems ?? undefined}
            selectedId={roomState.selectedId}
            mode={roomState.mode}
            scale={effectiveScale}
            onSelect={handlers.handleSelectItem}
            onChange={handlers.handleChangeItem}
            onDragStart={handlers.handleDragStart}
            onDragEnd={handlers.handleDragEnd}
            onComputerClick={handlers.handleComputerClick}
            onMusicPlayerClick={handlers.handleMusicPlayerClick}
            onGameClick={setActiveGameItemId}
            bringItemToFront={handlers.handleBringToFront}
            sendItemToBack={handlers.handleSendToBack}
            onboardingStep={onboardingStep}
            handleMusicToggle={handlers.handleMusicToggle}
            musicInteractionToken={roomState.musicInteractionToken}
            presenceRoomId={presenceRoomId}
            visitors={visitors}
            visitorId={visitorId}
            isGuest={isGuest}
            currentGameId={activeGameItemId}
        />
    );

    return (
        <>
            <RoomExperience
                roomBackgroundImageUrl={roomBackgroundImageUrl ?? undefined}
                scale={scale}
                zoomLevel={zoomLevel}
                panOffset={panOffset}
                timeOfDay={timeOfDay}
                containerRef={containerRef}
                onDragOver={handleDragOver}
                onDrop={handlers.handleDrop}
                onMouseMove={handleMouseEvent}
                onMouseEnter={handleMouseEvent}
                onPointerMove={handlePointerEvent}
                onPointerEnter={handlePointerEvent}
                onPointerDown={(e) => {
                    handlePointerDown(e);
                    handleTouchPlaceRoom(e);
                }}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                onBackgroundClick={handlers.handleBackgroundClick}
                outerClassName={roomState.draggedItemId ? "select-none" : ""}
                outerStyle={{
                    paddingLeft: drawerInsetLeft,
                    paddingBottom: drawerInsetBottom,
                    transition: "padding 300ms cubic-bezier(0.4, 0, 0.2, 1)",
                }}
                roomContent={roomContent}
                overlays={
                    <>
                        <RoomOverlays {...overlaysModel} />
                        {roomState.saveStatus !== "clean" && (
                            <div
                                className="absolute top-24 right-4 z-50 max-w-80 rounded-xl border-2 border-[var(--color-foreground)] bg-[var(--color-background)] p-3 text-[var(--color-foreground)] shadow-[var(--shadow-4)] pointer-events-auto"
                                style={{ left: drawerOrientation === "left" ? 16 + toolbarOffset : 16 }}
                                onPointerDown={(event) => event.stopPropagation()}
                            >
                                <RoomSaveFeedback
                                    saveStatus={roomState.saveStatus}
                                    saveError={roomState.saveError}
                                    onRetrySave={() => roomState.editingSession.retrySave()}
                                />
                            </div>
                        )}
                    </>
                }
            />
            <MobileZoomButton zoomLevel={zoomLevel} zoomLabel={zoomLabel} onCycleZoom={cycleZoom} />
        </>
    );
}
