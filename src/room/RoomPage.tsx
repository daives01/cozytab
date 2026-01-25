import { useMutation, useQuery } from "convex/react";
import type { Id } from "@convex/_generated/dataModel";
import { api } from "@convex/_generated/api";
import { useState, useRef, useCallback, useEffect, useMemo, type DragEvent } from "react";
import type { RoomItem, Shortcut } from "@shared/guestTypes";
import { useOnboarding } from "./hooks/useOnboarding";
import { useDailyReward } from "./hooks/useDailyReward";
import type { DailyRewardToastPayload } from "./types";
import { useUser } from "@clerk/clerk-react";
import type React from "react";
import { useCozyCursor } from "./hooks/useCozyCursor";
import { useCursorColor } from "./hooks/useCursorColor";
import { useRoomViewportScale } from "./hooks/useRoomViewportScale";
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
import { useRoomOverlaysModel } from "./hooks/useRoomOverlaysModel";
import { RoomItemsLayer } from "./components/RoomItemsLayer";
import { RoomOverlays } from "./components/RoomOverlays";
import { RoomShell } from "./components/RoomShell";
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
    useDailyRewardToastTimer,
    useOnboardingAssetPrefetch,
    useEscapeToExitEditMode,
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
    const roomState = useRoomState({ isGuest, guestSession, catalogItems });

    const localItems = roomState.localItems as RoomItem[];
    const setLocalItems = roomState.setLocalItems as (updater: RoomItem[] | ((prev: RoomItem[]) => RoomItem[])) => void;
    const placedCatalogItemIds = useMemo(() => localItems.map((item) => item.catalogItemId), [localItems]);
    const { canPlace: canPlaceItem } = usePlacementAllowance({
        isGuest,
        placedCatalogItemIds,
        guestInventoryIds: roomState.guestInventoryValue as Id<"catalogItems">[],
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
    const { viewportWidth, viewportHeight, scale } = useRoomViewportScale();
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
        (isGuest ? roomState.guestCursorColor : roomState.authedCursorColor ?? user?.cursorColor ?? computerState?.cursorColor) ??
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

    useCursorColorSaver(saveComputer, roomState.authedShortcutsRef, roomState.saveAuthedCursorColorRef);

    const { orientation: drawerOrientation, drawerInsetLeft, drawerInsetBottom, toolbarOffset } = useDrawerLayout(
        roomState.isDrawerOpen,
        viewportWidth,
        viewportHeight
    );

    const markGuestOnboardingComplete = useCallback(() => {
        roomState.setGuestOnboardingCompletedValue(true);
    }, [roomState]);

    const updateGuestCoins = useCallback(
        (next: number | ((prev: number) => number)) => roomState.setGuestCoinsValue(next),
        [roomState]
    );

    const updateGuestInventory = useCallback(
        (updater: (prev: Id<"catalogItems">[]) => Id<"catalogItems">[]) => {
            (roomState.setGuestInventoryValue as unknown as (fn: (prev: Id<"catalogItems">[]) => Id<"catalogItems">[]) => void)(
                updater
            );
        },
        [roomState]
    );

    const updateGuestShortcuts = useCallback(
        (next: Shortcut[]) => roomState.setLocalShortcuts(next),
        [roomState]
    );

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
        [isGuest, roomState]
    );

    useGuestBootstrap({
        isGuest,
        guestSessionLoadedRef: roomState.guestSessionLoadedRef,
        initialGuestSession: roomState.initialGuestSession,
        guestRoomItems: guestRoom?.items as RoomItem[] | undefined,
        guestTemplateItems: (guestTemplate as { items?: RoomItem[] } | null | undefined)?.items,
        setLocalItems,
    });

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
        wsRef,
    } = usePresenceAndChat({
        roomId: presenceRoomId,
        identity: { id: visitorId ?? "owner", name: ownerName, cursorColor },
        isOwner: true,
    });

    const [activeGameItemId, setActiveGameItemId] = useState<string | null>(null);

    const isInMenu = roomState.isComputerOpen || Boolean(roomState.musicPlayerItemId) || Boolean(activeGameItemId);
    useEffect(() => {
        setInMenu(isInMenu);
    }, [isInMenu, setInMenu]);

    const handleGameActiveChange = useCallback((gameItemId: string | null) => {
        setInGame(gameItemId);
    }, [setInGame]);

    useOwnerPresenceCursorSync({ isGuest, updateCursor, screenCursor, hasVisitors, lastRoomPositionRef });

    useDebouncedRoomSave({ isGuest, mode: roomState.mode, room, localItems, saveRoom });

    useEnsureRoomLoaded({
        room,
        isGuest,
        setLocalItems: (items) => setLocalItems(items),
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
        placedCatalogItemIds,
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
        roomId: room?._id ?? null,
        containerRef,
        scale,
        lastRoomPositionRef,
        hasVisitors,
        onboardingStep,
        advanceOnboarding,
        computerGuardAllowOpen: computed.computerGuard.allowOpen,
        setLocalItems,
        setSelectedId: roomState.setSelectedId,
        setDraggedItemId: roomState.setDraggedItemId,
        setIsComputerOpen: roomState.setIsComputerOpen,
        setMusicPlayerItemId: roomState.setMusicPlayerItemId,
        setIsDrawerOpen: roomState.setIsDrawerOpen,
        setMode: roomState.setMode,
        updateCursor,
        saveRoom,
        updateGuestShortcuts,
        saveComputer,
        cursorColor,
        canPlaceItem,
    });

    useEscapeToExitEditMode(roomState.mode, handlers.handleModeToggle);

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
        initialGuestSession: roomState.initialGuestSession,
        room,
        guestTemplate,
        guestRoom,
    });

    const overlaysModel = useRoomOverlaysModel({
        isGuest,
        roomState,
        computed,
        handlers,
        localItems,
        catalogItems,
        placedCatalogItemIds,
        layout: { toolbarOffset, drawerOrientation },
        onboarding: { onboardingStep, onboardingActive, advanceOnboarding, handleOnboardingComplete },
        presence: {
            hasVisitors,
            visitorCount,
            updateChatMessage,
            localChatMessage,
            screenCursor,
            connectionState,
            wsRef,
            visitors,
            activeInvites,
        },
        economy: {
            userCurrency: user?.currency ?? roomState.guestCoinsValue ?? 0,
            effectiveNextRewardAt,
            effectiveLoginStreak,
            updateGuestCoins,
            updateGuestInventory,
            startingCoins: GUEST_STARTING_COINS,
        },
        profile: { cursorColor, handleCursorColorChange },
        time: { timeOfDay: computed.timeOfDay, overrideTimeOfDay: computed.overrideTimeOfDay, setOverrideTimeOfDay },
        toasts: { dailyRewardToast, showStripeSuccessToast, setShowStripeSuccessToast },
        game: { activeGameItemId, setActiveGameItemId, handleGameActiveChange, visitorId: visitorId ?? "owner", setGameMetadata },
        room,
        saveRoom,
    });

    if (gate) return gate;

    const roomContent = (
        <RoomItemsLayer
            items={localItems}
            catalogItems={catalogItems ?? undefined}
            selectedId={roomState.selectedId}
            mode={roomState.mode}
            scale={scale}
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
        <RoomShell
            roomBackgroundImageUrl={roomBackgroundImageUrl ?? undefined}
            scale={scale}
            timeOfDay={timeOfDay}
            containerRef={containerRef}
            onDragOver={handleDragOver}
            onDrop={handlers.handleDrop}
            onMouseMove={handleMouseEvent}
            onMouseEnter={handleMouseEvent}
            onBackgroundClick={handlers.handleBackgroundClick}
            outerClassName={roomState.draggedItemId ? "select-none" : ""}
            outerStyle={{
                paddingLeft: drawerInsetLeft,
                paddingBottom: drawerInsetBottom,
                transition: "padding 300ms cubic-bezier(0.4, 0, 0.2, 1)",
            }}
            roomContent={roomContent}
            overlays={<RoomOverlays {...overlaysModel} />}
        />
    );
}
