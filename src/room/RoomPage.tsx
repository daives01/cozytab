import { useMutation } from "convex/react";
import type { Id } from "../../convex/_generated/dataModel";
import { api } from "../../convex/_generated/api";
import { useState, useRef, useCallback, type DragEvent } from "react";
import type { RoomItem, ComputerShortcut } from "../types";
import { useOnboarding } from "./hooks/useOnboarding";
import { useDailyReward } from "./hooks/useDailyReward";
import type { DailyRewardToastPayload } from "./types/dailyReward";
import { useUser } from "@clerk/clerk-react";
import type React from "react";
import { useRoomScale } from "./hooks/useRoomScale";
import { useCozyCursor } from "./hooks/useCozyCursor";
import { useCursorColor } from "./hooks/useCursorColor";
import { ROOM_HEIGHT, ROOM_WIDTH } from "./roomConstants";
import { useDrawerLayout } from "./hooks/useDrawerLayout";
import { clearGuestSession } from "./guestSession";
import { useRoomData } from "./hooks/useRoomData";
import { usePresenceAndChat } from "./hooks/usePresenceChat";
import { useTimeOfDayControls } from "./hooks/useTimeOfDayControls";
import { useRoomState } from "./hooks/useRoomState";
import { useRoomHandlers } from "./hooks/useRoomHandlers";
import { useRoomComputed } from "./hooks/useRoomComputed";
import { useRoomGate } from "./hooks/useRoomGate";
import { RoomShell } from "./RoomShell";
import { RoomItemsLayer } from "./components/RoomItemsLayer";
import { RoomOverlays } from "./components/RoomOverlays";
import { GUEST_STARTING_COINS, type GuestSessionState } from "../../shared/guestTypes";
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
    const { timeOfDay, overrideTimeOfDay, setOverrideTimeOfDay } = useTimeOfDayControls();
    const {
        room,
        guestTemplate,
        guestRoom,
        user,
        catalogItems,
        computerState,
        backgroundUrl,
        resolvedComputerAssetUrl,
    } = useRoomData({ isGuest, timeOfDay });
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
    } = useRoomState({ isGuest, guestSession });
    const createRoom = useMutation(api.rooms.createRoom);
    const saveRoom = useMutation(api.rooms.saveMyRoom);
    const updateMusicState = useMutation(api.rooms.updateMusicState);
    const renewLease = useMutation(api.rooms.renewLease);
    const saveComputer = useMutation(api.users.saveMyComputer);
    const claimDailyReward = useMutation(api.users.claimDailyReward);
    const completeOnboarding = useMutation(api.users.completeOnboarding);

    const scale = useRoomScale(ROOM_WIDTH, ROOM_HEIGHT);
    const [dailyRewardToast, setDailyRewardToast] = useState<DailyRewardToastPayload | null>(null);
    const { width: viewportWidth, height: viewportHeight } = useViewportSize();
    const containerRef = useRef<HTMLDivElement | null>(null);
    const lastRoomPositionRef = useRef({ x: ROOM_WIDTH / 2, y: ROOM_HEIGHT / 2 });
    const computerPrefetchedRef = useRef(false);
    const reconciledGuestOnboarding = useRef(false);

    useCozyCursor(true);
    const cursorColor =
        (isGuest ? guestCursorColor : authedCursorColor ?? computerState?.cursorColor ?? user?.cursorColor) ??
        "var(--chart-4)";
    useCursorColor(cursorColor);

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
        (updater: (prev: string[]) => string[]) => setGuestInventoryValue(updater),
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
        initialGuestSession,
        guestRoomItems: guestRoom?.items as RoomItem[] | undefined,
        guestTemplateItems: (guestTemplate as { items?: RoomItem[] } | null | undefined)?.items,
        setLocalItems,
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
    } = usePresenceAndChat({
        roomId: presenceRoomId,
        identity: { id: visitorId ?? "owner", name: ownerName, cursorColor },
        isOwner: true,
    });

    useOwnerPresenceCursorSync({ isGuest, updateCursor, screenCursor, hasVisitors, lastRoomPositionRef });

    useDebouncedRoomSave({ isGuest, mode, room, localItems, saveRoom });

    useEnsureRoomLoaded({
        room,
        isGuest,
        setLocalItems: (items) => setLocalItems(items),
        createRoom: () => createRoom({}),
    });

    useLeaseHeartbeat({ isGuest, room, renewLease });

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

    const updateMusicStateOwner = useCallback(
        (args: {
            roomId: Id<"rooms">;
            itemId: string;
            musicPlaying: boolean;
            musicStartedAt: number;
            musicPositionAtStart: number;
        }) => updateMusicState(args),
        [updateMusicState]
    );

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
        setLocalItems,
        setSelectedId,
        setDraggedItemId,
        setIsComputerOpen,
        setMusicPlayerItemId,
        setIsDrawerOpen,
        setMode,
        updateCursor,
        updateMusicState: updateMusicStateOwner,
        updateGuestShortcuts,
        saveComputer,
        cursorColor,
    });

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
        initialGuestSession,
        room,
        guestTemplate,
        guestRoom,
    });

    if (gate) return gate;

    const roomContent = (
        <RoomItemsLayer
            items={localItems}
            selectedId={selectedId}
            mode={mode}
            scale={scale}
            onSelect={(id) => handlers.handleSelectItem(id)}
            onChange={(newItem) => handlers.handleChangeItem(newItem)}
            onDragStart={(id) => handlers.handleDragStart(id)}
            onDragEnd={() => handlers.handleDragEnd()}
            onComputerClick={() => handlers.handleComputerClick()}
            onMusicPlayerClick={(id) => handlers.handleMusicPlayerClick(id)}
            bringItemToFront={(id) => handlers.handleBringToFront(id)}
            sendItemToBack={(id) => handlers.handleSendToBack(id)}
            onboardingStep={onboardingStep}
            handleMusicToggle={handlers.handleMusicToggle}
            musicAutoplay={musicAutoplay}
            presenceRoomId={presenceRoomId}
            visitors={visitors}
            visitorId={visitorId}
            isGuest={isGuest}
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
            onToggleMode={handlers.handleModeToggle}
            onShareClick={() => setIsShareModalOpen(true)}
            onDrawerToggle={handlers.handleDrawerToggle}
            onDeleteItem={(itemId) => {
                setLocalItems((prev: RoomItem[]) => prev.filter((item: RoomItem) => item.id !== itemId));
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
            guestInventory={guestInventoryValue}
            onGuestPurchase={(itemId) => {
                updateGuestInventory((prev) => {
                    if (prev.includes(itemId)) return prev;
                    return [...prev, itemId];
                });
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
            localItems={localItems}
            onMusicSave={(updatedItem, updatedItems) => {
                setLocalItems(updatedItems);
                if (updatedItem.musicUrl) {
                    setMusicAutoplay({ itemId: updatedItem.id, token: `${updatedItem.id}-${Date.now()}` });
                }
            }}
            onCloseMusic={() => setMusicPlayerItemId(null)}
            onUpdateMusicState={(itemId, startedAt, position) => {
                if (!room) return;
                updateMusicState({
                    roomId: room._id,
                    itemId,
                    musicPlaying: true,
                    musicStartedAt: startedAt,
                    musicPositionAtStart: position,
                });
            }}
            roomId={room?._id ?? null}
            isGuestMode={isGuest}
            onboardingActive={onboardingActive}
            onboardingStep={onboardingStep}
            onAdvanceOnboarding={advanceOnboarding}
            onCompleteOnboarding={handleOnboardingComplete}
            dailyRewardToast={dailyRewardToast}
            hasVisitors={hasVisitors}
            isComputerOpenState={isComputerOpen}
            isShareModalOpen={isShareModalOpen}
            onCloseShareModal={() => setIsShareModalOpen(false)}
            updateChatMessage={updateChatMessage}
            localChatMessage={localChatMessage}
            screenCursor={screenCursor}
        />
    );

    return (
        <RoomShell
            backgroundUrl={backgroundUrl ?? null}
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
    );
}
