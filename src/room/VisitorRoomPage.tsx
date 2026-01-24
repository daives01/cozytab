import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useUser } from "@clerk/clerk-react";
import { useQuery, useMutation } from "convex/react";
import { Link, useParams } from "react-router-dom";
import { useAtomValue, useSetAtom } from "jotai";
import { ItemNode } from "./ItemNode";
import { MusicPlayerButtons } from "@/musicPlayer/MusicPlayerButtons";
import { MusicNotesOverlay } from "@/musicPlayer/MusicNotesOverlay";
import { LocalCursor } from "@/presence/LocalCursor";
import { ChatInput } from "./ChatInput";
import { Button } from "@/components/ui/button";
import { Home, Users } from "lucide-react";
import type { Shortcut, RoomItem, GameType } from "@/types";
import type { Id } from "@convex/_generated/dataModel";
import { api } from "@convex/_generated/api";
import { RoomPage } from "./RoomPage";
import { useRoomBackgroundImageUrl } from "./hooks/useRoomBackgroundImageUrl";
import { useCozyCursor } from "./hooks/useCozyCursor";
import { useCursorColor } from "./hooks/useCursorColor";
import { useRoomViewportScale } from "./hooks/useRoomViewportScale";
import { useTimeOfDayControls } from "@/hooks/useTimeOfDayControls";
import { isMusicItem } from "./roomUtils";
import { randomBrightColor } from "./utils/cursorColor";
import { getReferralCode, saveReferralCode } from "../referralStorage";
import { ComputerOverlay } from "@/computer/ComputerOverlay";
import { GUEST_STARTING_COINS } from "@shared/guestTypes";
import { OnboardingSpotlight } from "./OnboardingSpotlight";
import {
    guestCoinsAtom,
    guestCursorColorAtom,
    guestInventoryAtom,
    guestNormalizedShortcutsAtom,
    guestShortcutsAtom,
} from "@/guest/state";
import { usePresenceAndChat } from "@/presence/usePresenceChat";
import { PresenceLayer } from "@/presence/PresenceLayer";
import { RoomShell } from "./components/RoomShell";
import { VisitorMusicModal } from "@/musicPlayer/VisitorMusicModal";
import { GameOverlay } from "@/games/components/GameOverlay";
import { ChatHint } from "./components/ChatHint";

const musicUrlKey = (item: RoomItem) => `${item.musicType ?? ""}:${item.musicUrl ?? ""}`;
const VISITOR_CHAT_ONBOARDING_KEY = "cozytab:visitor-chat-onboarding";

type InviteQueryResult = ReturnType<typeof useQuery<typeof api.rooms.getRoomByInvite>>;

export function VisitorRoomPage() {
    const { token } = useParams<{ token: string }>();
    const { isSignedIn } = useUser();
    const authedUser = useQuery(api.users.getMe, isSignedIn ? {} : "skip");
    const roomData = useQuery(api.rooms.getRoomByInvite, token ? { token } : "skip");

    const isOwnerLoading = isSignedIn && authedUser === undefined;
    const isOwnerViewingInvite =
        isSignedIn && Boolean(authedUser?._id && roomData?.room?.userId === authedUser._id);

    if (!token) {
        return (
            <div className="h-screen w-screen flex flex-col items-center justify-center font-['Patrick_Hand'] text-xl gap-4">
                <p>Invalid invite link</p>
                <Link to="/">
                    <Button>
                        <Home className="mr-2 h-4 w-4" />
                        Go Home
                    </Button>
                </Link>
            </div>
        );
    }

    if (isOwnerLoading || roomData === undefined) {
        return (
            <div className="h-screen w-screen flex items-center justify-center font-['Patrick_Hand'] text-xl">
                Loading room...
            </div>
        );
    }

    if (isOwnerViewingInvite && roomData?.room?._id) {
        return <RoomPage isGuest={false} />;
    }

    return (
        <VisitorRoomPageContent
            roomData={roomData as Exclude<InviteQueryResult, undefined>}
            authedUser={authedUser}
        />
    );
}

function VisitorRoomPageContent({
    roomData,
    authedUser,
}: {
    roomData: Exclude<InviteQueryResult, undefined>;
    authedUser: ReturnType<typeof useQuery<typeof api.users.getMe>>;
}) {
    const roomStatus = useQuery(
        api.rooms.getRoomStatus,
        roomData?.room?._id ? { roomId: roomData.room._id } : "skip"
    );
    const { user: clerkUser, isSignedIn } = useUser();
    const computerState = useQuery(api.users.getMyComputer, isSignedIn ? {} : "skip");
    const catalogItems = useQuery(api.catalog.list);
    const saveComputer = useMutation(api.users.saveMyComputer);

    const { scale } = useRoomViewportScale();
    const containerRef = useRef<HTMLDivElement | null>(null);

    const [guestVisitorId] = useState(() => `visitor-${crypto.randomUUID()}`);
    const [guestVisitorName] = useState(() => `Visitor ${Math.floor(Math.random() * 1000)}`);
    const [guestCursorColor] = useState(() => randomBrightColor());
    const [isComputerOpen, setIsComputerOpen] = useState(false);
    const [activeMusicItemId, setActiveMusicItemId] = useState<string | null>(null);
    const [visitorShortcutsOverride, setVisitorShortcutsOverride] = useState<Shortcut[] | null>(null);
    const [visitorCursorColorOverride, setVisitorCursorColorOverride] = useState<string | null>(null);
    const [visitorDisplayNameOverride, setVisitorDisplayNameOverride] = useState<string | null>(null);
    const { timeOfDay, overrideTimeOfDay, setOverrideTimeOfDay } = useTimeOfDayControls();
    const items = roomData?.room?.items as RoomItem[] | undefined;

    const [visitorMusicOverrides, setVisitorMusicOverrides] = useState<
        Record<string, { urlKey: string; playing: boolean; startedAt: number; positionAtStart: number }>
    >({});
    const baseVisitorMusicState = useMemo(() => {
        if (!items) return {};
        const next: Record<string, { urlKey: string; playing: boolean; startedAt: number; positionAtStart: number }> =
            {};
        for (const item of items) {
            if (!isMusicItem(item)) continue;
            const key = musicUrlKey(item);
            const playing = item.musicPlaying ?? false;

            next[item.id] = {
                urlKey: key,
                playing,
                startedAt: item.musicStartedAt ?? 0,
                positionAtStart: item.musicPositionAtStart ?? 0,
            };
        }
        return next;
    }, [items]);
    const visitorMusicState = useMemo(() => {
        const next: Record<string, { urlKey: string; playing: boolean; startedAt: number; positionAtStart: number }> =
            {};
        for (const [itemId, baseState] of Object.entries(baseVisitorMusicState)) {
            const override = visitorMusicOverrides[itemId];
            const useOverride = override && override.urlKey === baseState.urlKey;
            const wantsPlay = useOverride ? override.playing : true;
            next[itemId] = {
                urlKey: baseState.urlKey,
                // Host is authoritative: only play if host is playing AND visitor opted in.
                playing: baseState.playing && wantsPlay,
                startedAt: baseState.startedAt,
                positionAtStart: baseState.positionAtStart,
            };
        }
        return next;
    }, [baseVisitorMusicState, visitorMusicOverrides]);

    const activeMusicItem = useMemo(() => {
        if (!activeMusicItemId || !items) return null;
        const rawItem = items.find((i) => i.id === activeMusicItemId);
        if (!rawItem) return null;
        const musicState = visitorMusicState[rawItem.id];
        return musicState
            ? {
                  ...rawItem,
                  musicPlaying: musicState.playing,
                  musicStartedAt: musicState.startedAt,
                  musicPositionAtStart: musicState.positionAtStart,
              }
            : rawItem;
    }, [activeMusicItemId, items, visitorMusicState]);

    // Guest-local computer state
    const guestShortcutsNormalized = useAtomValue(guestNormalizedShortcutsAtom);
    const setGuestShortcuts = useSetAtom(guestShortcutsAtom);
    const guestCoins = useAtomValue(guestCoinsAtom);
    const setGuestCoins = useSetAtom(guestCoinsAtom);
    const guestInventory = useAtomValue(guestInventoryAtom);
    const setGuestInventory = useSetAtom(guestInventoryAtom);
    const setGuestCursorColor = useSetAtom(guestCursorColorAtom);
    const guestCursorColorValue = useAtomValue(guestCursorColorAtom);

    const isGuestVisitor = !isSignedIn;

    const visitorIdentity = {
        id: isSignedIn && clerkUser?.id ? clerkUser.id : guestVisitorId,
        name:
            visitorDisplayNameOverride ??
            authedUser?.displayName ??
            authedUser?.username ??
            clerkUser?.username ??
            guestVisitorName,
        cursorColor:
            visitorCursorColorOverride ??
            (isGuestVisitor
                ? guestCursorColorValue ?? guestCursorColor
                : authedUser?.cursorColor ?? computerState?.cursorColor ?? guestCursorColor),
    };
    const [roomClosedOverride, setRoomClosedOverride] = useState(false);
    const isStatusOpen = roomStatus?.status === "open";
    const roomUnavailable = roomStatus ? roomStatus.status !== "open" : true;
    const roomClosed = roomClosedOverride || roomData?.closed === true || roomUnavailable;
    const presenceRoomId =
        isStatusOpen && !roomData?.closed && !roomClosed ? roomData?.room?._id ?? null : null;
    const [visitorChatOnboardingDismissed, setVisitorChatOnboardingDismissed] = useState(() => {
        if (typeof window === "undefined") return false;
        return Boolean(window.localStorage.getItem(VISITOR_CHAT_ONBOARDING_KEY));
    });
    const showVisitorChatOnboarding = Boolean(presenceRoomId && !visitorChatOnboardingDismissed);

    const {
        visitors,
        updateCursor,
        updateChatMessage,
        screenCursor,
        localChatMessage,
        setInMenu,
        setInGame,
        setGameMetadata,
        connectionState,
    } = usePresenceAndChat({
        roomId: presenceRoomId,
        identity: {
            id: visitorIdentity.id,
            name: visitorIdentity.name,
            cursorColor: visitorIdentity.cursorColor,
        },
        isOwner: false,
    });
    const [activeGameItemId, setActiveGameItemId] = useState<string | null>(null);
    const activeGameType = useMemo((): GameType | null => {
        if (!activeGameItemId || !items || !catalogItems) return null;
        const roomItem = items.find((i) => i.id === activeGameItemId);
        if (!roomItem) return null;
        const catalogItem = catalogItems.find((c) => c._id === roomItem.catalogItemId);
        return catalogItem?.gameType ?? null;
    }, [activeGameItemId, items, catalogItems]);
    const isInMenu = isComputerOpen || Boolean(activeMusicItem) || Boolean(activeGameItemId);
    useEffect(() => {
        setInMenu(isInMenu);
    }, [isInMenu, setInMenu]);
    const handleGameActiveChange = useCallback((gameItemId: string | null) => {
        setInGame(gameItemId);
    }, [setInGame]);
    const handleDismissChatOnboarding = useCallback(() => {
        setVisitorChatOnboardingDismissed(true);
        if (typeof window !== "undefined") {
            window.localStorage.setItem(VISITOR_CHAT_ONBOARDING_KEY, "1");
        }
    }, []);
    const roomBackgroundImageUrl = useRoomBackgroundImageUrl(roomData?.room?.template?.backgroundUrl, timeOfDay);
    useCozyCursor(true);
    useCursorColor(visitorIdentity.cursorColor);

    useEffect(() => {
        const ownerReferralCode = roomData?.ownerReferralCode;
        if (!ownerReferralCode) return;

        const existingCode = getReferralCode();
        if (!existingCode) {
            saveReferralCode(ownerReferralCode);
        }
    }, [roomData?.ownerReferralCode]);

    useEffect(() => {
        if (!roomData?.room?._id) return;
        if (roomClosed) return;
        if (roomStatus?.status !== "open") return;

        const closesAt = roomStatus.closesAt;
        if (!closesAt) return;

        const delay = closesAt - Date.now();
        if (delay <= 0) {
            setTimeout(() => setRoomClosedOverride(true), 0);
            return;
        }

        const timer = setTimeout(() => {
            setRoomClosedOverride(true);
        }, delay);

        return () => clearTimeout(timer);
    }, [roomClosed, roomData?.room?._id, roomStatus?.closesAt, roomStatus?.status]);

    const handleMusicToggle = (itemId: string, playing: boolean, urlKey?: string) => {
        const hostItem = items?.find((i) => i.id === itemId);
        const hostStartedAt = hostItem?.musicStartedAt ?? 0;
        const hostPositionAtStart = hostItem?.musicPositionAtStart ?? 0;
        setVisitorMusicOverrides((prev) => {
            const existing = prev[itemId] ?? baseVisitorMusicState[itemId];
            const key = urlKey ?? existing?.urlKey ?? "";
            return {
                ...prev,
                [itemId]: {
                    urlKey: key,
                    playing,
                    startedAt: playing ? hostStartedAt : 0,
                    positionAtStart: playing ? hostPositionAtStart : hostPositionAtStart,
                },
            };
        });
    };

    const updateCursorFromClient = useCallback(
        (clientX: number, clientY: number) => {
            if (!containerRef.current) return;

            const rect = containerRef.current.getBoundingClientRect();
            const roomX = (clientX - rect.left) / scale;
            const roomY = (clientY - rect.top) / scale;
            updateCursor(roomX, roomY, clientX, clientY);
        },
        [scale, updateCursor]
    );

    const handleMouseEvent = (e: React.MouseEvent) => {
        updateCursorFromClient(e.clientX, e.clientY);
    };

    const handleOpenComputer = useCallback(() => {
        setIsComputerOpen(true);
    }, []);

    const overlayShortcuts = useMemo(() => {
        if (!isSignedIn) return guestShortcutsNormalized;
        if (visitorShortcutsOverride) return visitorShortcutsOverride;
        return (computerState?.shortcuts as Shortcut[] | undefined) ?? [];
    }, [computerState?.shortcuts, guestShortcutsNormalized, isSignedIn, visitorShortcutsOverride]);

    const overlayCurrency = isSignedIn ? authedUser?.currency ?? 0 : guestCoins;
    const overlayNextReward = isSignedIn ? authedUser?.nextRewardAt ?? undefined : undefined;
    const overlayLoginStreak = isSignedIn ? authedUser?.loginStreak ?? undefined : undefined;
    const overlayDisplayName = isSignedIn ? visitorIdentity.name : undefined;
    const overlayUsername = isSignedIn ? clerkUser?.username ?? "you" : undefined;
    const overlayCursorColor = visitorIdentity.cursorColor;

    if (roomData === null) {
        return (
            <div className="h-screen w-screen flex flex-col items-center justify-center font-['Patrick_Hand'] text-xl gap-4">
                <p>This invite link is invalid or has expired</p>
                <Link to="/">
                    <Button>
                        <Home className="mr-2 h-4 w-4" />
                        Go Home
                    </Button>
                </Link>
            </div>
        );
    }

    if (roomClosed) {
        return (
            <div className="h-screen w-screen flex flex-col items-center justify-center font-['Patrick_Hand'] text-xl gap-4">
                <p>The host stepped away.</p>
                <Link to="/">
                    <Button>
                        <Home className="mr-2 h-4 w-4" />
                        Go Home
                    </Button>
                </Link>
            </div>
        );
    }

    const roomContent = (
        <>
            {items?.map((item) => {
                const musicState = visitorMusicState[item.id];
                const localMusicItem = musicState
                    ? {
                          ...item,
                          musicPlaying: musicState.playing,
                          musicStartedAt: musicState.startedAt,
                          musicPositionAtStart: musicState.positionAtStart,
                      }
                    : {
                          ...item,
                          musicPlaying: item.musicPlaying ?? false,
                          musicStartedAt: item.musicStartedAt ?? 0,
                          musicPositionAtStart: item.musicPositionAtStart ?? 0,
                      };
                const catalogItem = catalogItems?.find((c) => c._id === item.catalogItemId);

                return (
                    <ItemNode
                        key={item.id}
                        item={localMusicItem}
                        catalogItem={catalogItem}
                        isSelected={false}
                        mode="view"
                        scale={scale}
                        onSelect={() => {}}
                        onChange={() => {}}
                        onDragStart={() => {}}
                        onDragEnd={() => {}}
                        onComputerClick={handleOpenComputer}
                        onMusicPlayerClick={() => setActiveMusicItemId(item.id)}
                        onGameClick={() => setActiveGameItemId(item.id)}
                        isVisitor={true}
                        overlay={
                            isMusicItem(item) ? (
                                <>
                                    <MusicNotesOverlay playing={Boolean(localMusicItem.musicPlaying)} seed={item.id} />
                                    <MusicPlayerButtons
                                        key={item.id}
                                        item={localMusicItem}
                                        onToggle={(playing) => handleMusicToggle(item.id, playing, musicUrlKey(item))}
                                        autoPlayToken={
                                            visitorMusicState[item.id]?.playing
                                                ? `${visitorMusicState[item.id].urlKey}-${visitorMusicState[item.id].startedAt}`
                                                : null
                                        }
                                        isVisitor={true}
                                    />
                                </>
                            ) : null
                        }
                    />
                );
            })}

            <PresenceLayer
                visitors={visitors}
                currentVisitorId={visitorIdentity.id}
                scale={scale}
                currentGameId={activeGameItemId}
                items={items}
            />
        </>
    );

    const overlays = (
        <>
            <div className="absolute top-4 left-4 flex gap-3 pointer-events-auto items-center" style={{ zIndex: 50 }}>
                <div className="bg-[var(--paper)] backdrop-blur-sm rounded-xl px-4 py-2 shadow-md border-2 border-[var(--ink)]">
                    <div className="text-sm text-[var(--ink-subtle)] uppercase tracking-wide text-xs">Visiting</div>
                    <div className="font-bold text-lg text-[var(--ink)]">{roomData.ownerName}'s Room</div>
                </div>
            </div>

            <div className="absolute top-4 right-4 flex gap-3 pointer-events-auto items-center" style={{ zIndex: 50 }}>
                {visitors.length > 1 && (
                    <div className="bg-[var(--paper)] backdrop-blur-sm rounded-xl px-3 py-2 shadow-md border-2 border-[var(--ink)] flex items-center gap-2">
                        <Users className="h-4 w-4 text-[var(--ink)]" />
                        <span className="font-bold text-[var(--ink)]">{visitors.length}</span>
                    </div>
                )}
                <Link to="/">
                    <Button variant="outline" className="bg-[var(--paper)] backdrop-blur-sm shadow-md">
                        <Home className="mr-2 h-4 w-4" />
                        My Room
                    </Button>
                </Link>
            </div>

            {connectionState !== "connected" && (
                <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-2">
                    <div className="rounded-xl border-2 border-[var(--color-foreground)] bg-[var(--color-background)] shadow-[4px_4px_0px_0px_var(--color-foreground)] px-4 py-3 flex items-center gap-3">
                        <div className="h-4 w-4 border-2 border-[var(--color-foreground)] border-t-transparent rounded-full animate-spin" />
                        <span className="text-sm font-medium">
                            {connectionState === "connecting" ? "Connecting..." : "Reconnecting..."}
                        </span>
                    </div>
                </div>
            )}

            {showVisitorChatOnboarding && (
                <OnboardingSpotlight
                    message="Press Enter to chat"
                    messageContent={
                        <div className="space-y-2">
                            <p className="text-size-xl font-medium leading-relaxed text-[var(--color-foreground)]">
                                Press{" "}
                                <span className="inline-flex items-center justify-center rounded-lg border-2 border-[var(--color-foreground)] bg-[var(--color-secondary)] px-3 py-1 font-mono text-base shadow-[var(--shadow-3)]">
                                    Enter
                                </span>{" "}
                                to chat
                            </p>
                            <p className="text-sm text-[var(--color-muted-foreground)]">Hit Enter to start typing, Enter again to send.</p>
                        </div>
                    }
                    bubblePosition="bottom"
                    bubbleWidth={600}
                    onSkip={handleDismissChatOnboarding}
                    showSkip={false}
                    pulseTarget={false}
                    onNext={handleDismissChatOnboarding}
                    showNext
                />
            )}

            <ChatInput
                onMessageChange={updateChatMessage}
                disabled={connectionState !== "connected"}
            />
            <ChatHint />

            {activeMusicItem ? (
                <VisitorMusicModal item={activeMusicItem} onClose={() => setActiveMusicItemId(null)} />
            ) : null}

            <GameOverlay
                isOpen={!!activeGameItemId && !!activeGameType}
                gameType={activeGameType ?? "chess"}
                itemId={activeGameItemId ?? ""}
                visitorId={visitorIdentity.id}
                visitors={visitors}
                setGameMetadata={setGameMetadata}
                onClose={() => setActiveGameItemId(null)}
                onPointerMove={updateCursorFromClient}
                onGameActiveChange={handleGameActiveChange}
            />

            <LocalCursor
                x={screenCursor.x}
                y={screenCursor.y}
                chatMessage={localChatMessage}
                cursorColor={visitorIdentity.cursorColor}
            />

            <ComputerOverlay
                isGuest={isGuestVisitor}
                isComputerOpen={isComputerOpen}
                onCloseComputer={() => setIsComputerOpen(false)}
                shortcuts={overlayShortcuts}
                onUpdateShortcuts={(next) => {
                    if (isSignedIn) {
                        setVisitorShortcutsOverride(next);
                        saveComputer({ shortcuts: next, cursorColor: overlayCursorColor });
                    } else {
                        setGuestShortcuts(next);
                    }
                }}
                userCurrency={overlayCurrency}
                nextRewardAt={overlayNextReward}
                loginStreak={overlayLoginStreak}
                onPointerMove={updateCursorFromClient}
                guestCoins={guestCoins}
                onGuestCoinsChange={(coins) => setGuestCoins(coins)}
                startingCoins={GUEST_STARTING_COINS}
                guestInventory={guestInventory}
                onGuestPurchase={(itemId: Id<"catalogItems">) =>
                    setGuestInventory((prev) => (prev.includes(itemId) ? prev : [...prev, itemId]))
                }
                isOnboardingShopStep={false}
                displayName={overlayDisplayName}
                username={overlayUsername}
                onDisplayNameUpdated={(next) => setVisitorDisplayNameOverride(next)}
                cursorColor={overlayCursorColor}
                onCursorColorChange={(next) => {
                    const value = next?.trim();
                    if (!value) return;
                    setVisitorCursorColorOverride(value);
                    if (isSignedIn) {
                        saveComputer({ shortcuts: overlayShortcuts, cursorColor: value });
                    } else {
                        setGuestCursorColor(value);
                    }
                }}
                timeOfDay={timeOfDay}
                devTimeOfDay={overrideTimeOfDay}
                onSetDevTimeOfDay={setOverrideTimeOfDay}
            />
        </>
    );

    return (
        <RoomShell
            roomBackgroundImageUrl={roomBackgroundImageUrl ?? undefined}
            scale={scale}
            timeOfDay={timeOfDay}
            containerRef={containerRef}
            onMouseMove={handleMouseEvent}
            onMouseEnter={handleMouseEvent}
            roomContent={roomContent}
            overlays={overlays}
        />
    );
}
