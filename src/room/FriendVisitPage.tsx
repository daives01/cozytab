import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useUser, SignInButton } from "@clerk/clerk-react";
import { useQuery, useMutation } from "convex/react";
import { Link, useParams } from "react-router-dom";
import { ItemNode } from "./ItemNode";
import { MusicPlayerButtons } from "@/musicPlayer/MusicPlayerButtons";
import { MusicNotesOverlay } from "@/musicPlayer/MusicNotesOverlay";
import { LocalCursor } from "@/presence/LocalCursor";
import { ChatInput } from "./ChatInput";
import { Button } from "@/components/ui/button";
import { Home, Users } from "lucide-react";
import type { Shortcut, RoomItem } from "@shared/guestTypes";
import type { GameType } from "@convex/lib/categories";
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
import { GUEST_STARTING_COINS } from "@shared/guestTypes";
import { usePresenceAndChat } from "@/presence/usePresenceChat";
import { PresenceLayer } from "@/presence/PresenceLayer";
import { RoomShell } from "./components/RoomShell";
import { VisitorMusicModal } from "@/musicPlayer/VisitorMusicModal";
import { ChatHint } from "./components/ChatHint";
import { ComputerOverlay } from "@/computer/ComputerOverlay";
import { GameOverlay } from "@/games/components/GameOverlay";

const musicUrlKey = (item: RoomItem) => `${item.musicType ?? ""}:${item.musicUrl ?? ""}`;

export function FriendVisitPage() {
    const { friendUserId } = useParams<{ friendUserId: string }>();
    const { isSignedIn, isLoaded, user: clerkUser } = useUser();
    const authedUser = useQuery(api.users.getMe, isSignedIn ? {} : "skip");

    if (!isLoaded) {
        return (
            <div className="h-screen w-screen flex items-center justify-center font-['Patrick_Hand'] text-xl">
                Loading...
            </div>
        );
    }

    if (!isSignedIn) {
        return (
            <div className="h-screen w-screen flex flex-col items-center justify-center font-['Patrick_Hand'] text-xl gap-4">
                <p>You need to sign in to visit a friend's room.</p>
                <SignInButton mode="modal">
                    <Button>Sign In</Button>
                </SignInButton>
                <Link to="/">
                    <Button variant="outline">
                        <Home className="mr-2 h-4 w-4" />
                        Go Home
                    </Button>
                </Link>
            </div>
        );
    }

    if (!friendUserId) {
        return (
            <div className="h-screen w-screen flex flex-col items-center justify-center font-['Patrick_Hand'] text-xl gap-4">
                <p>Invalid friend link</p>
                <Link to="/">
                    <Button>
                        <Home className="mr-2 h-4 w-4" />
                        Go Home
                    </Button>
                </Link>
            </div>
        );
    }

    if (authedUser === undefined) {
        return (
            <div className="h-screen w-screen flex items-center justify-center font-['Patrick_Hand'] text-xl">
                Loading...
            </div>
        );
    }

    // If visiting own room, redirect to RoomPage
    if (authedUser?._id === friendUserId) {
        return <RoomPage isGuest={false} />;
    }

    return (
        <FriendVisitContent
            friendUserId={friendUserId as Id<"users">}
            authedUser={authedUser}
            clerkUser={clerkUser}
        />
    );
}

function FriendVisitContent({
    friendUserId,
    authedUser,
    clerkUser,
}: {
    friendUserId: Id<"users">;
    authedUser: NonNullable<ReturnType<typeof useQuery<typeof api.users.getMe>>>;
    clerkUser: ReturnType<typeof useUser>["user"];
}) {
    const roomData = useQuery(api.friends.getFriendRoom, { friendUserId });
    const computerState = useQuery(api.users.getMyComputer);
    const catalogItems = useQuery(api.catalog.list);
    const saveComputer = useMutation(api.users.saveMyComputer);

    const { scale } = useRoomViewportScale();
    const containerRef = useRef<HTMLDivElement | null>(null);

    const [isComputerOpen, setIsComputerOpen] = useState(false);
    const [activeMusicItemId, setActiveMusicItemId] = useState<string | null>(null);
    const [visitorShortcutsOverride, setVisitorShortcutsOverride] = useState<Shortcut[] | null>(null);
    const [visitorCursorColorOverride, setVisitorCursorColorOverride] = useState<string | null>(null);
    const [visitorDisplayNameOverride, setVisitorDisplayNameOverride] = useState<string | null>(null);
    const [fallbackCursorColor] = useState(() => randomBrightColor());
    const { timeOfDay, overrideTimeOfDay, setOverrideTimeOfDay } = useTimeOfDayControls();
    const items = roomData?.room?.items as RoomItem[] | undefined;

    const [visitorMusicOverrides, setVisitorMusicOverrides] = useState<
        Record<string, { urlKey: string; playing: boolean; startedAt: number; positionAtStart: number }>
    >({});
    const baseVisitorMusicState = useMemo(() => {
        if (!items) return {};
        const next: Record<string, { urlKey: string; playing: boolean; startedAt: number; positionAtStart: number }> = {};
        for (const item of items) {
            if (!isMusicItem(item)) continue;
            const key = musicUrlKey(item);
            next[item.id] = {
                urlKey: key,
                playing: item.musicPlaying ?? false,
                startedAt: item.musicStartedAt ?? 0,
                positionAtStart: item.musicPositionAtStart ?? 0,
            };
        }
        return next;
    }, [items]);

    const visitorMusicState = useMemo(() => {
        const next: Record<string, { urlKey: string; playing: boolean; startedAt: number; positionAtStart: number }> = {};
        for (const [itemId, baseState] of Object.entries(baseVisitorMusicState)) {
            const override = visitorMusicOverrides[itemId];
            const useOverride = override && override.urlKey === baseState.urlKey;
            const wantsPlay = useOverride ? override.playing : true;
            next[itemId] = {
                urlKey: baseState.urlKey,
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
            ? { ...rawItem, musicPlaying: musicState.playing, musicStartedAt: musicState.startedAt, musicPositionAtStart: musicState.positionAtStart }
            : rawItem;
    }, [activeMusicItemId, items, visitorMusicState]);

    const visitorIdentity = {
        id: clerkUser?.id ?? "",
        name:
            visitorDisplayNameOverride ??
            authedUser?.displayName ??
            authedUser?.username ??
            clerkUser?.username ??
            "Visitor",
        cursorColor:
            visitorCursorColorOverride ??
            authedUser?.cursorColor ??
            computerState?.cursorColor ??
            fallbackCursorColor,
    };

    // Friend rooms are always accessible – no TTL gating
    const presenceRoomId = roomData?.room?._id ?? null;

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
            convexUserId: authedUser?._id,
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

    const roomBackgroundImageUrl = useRoomBackgroundImageUrl(roomData?.room?.template?.backgroundUrl, timeOfDay);
    useCozyCursor(true);
    useCursorColor(visitorIdentity.cursorColor);

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
        if (visitorShortcutsOverride) return visitorShortcutsOverride;
        return (computerState?.shortcuts as Shortcut[] | undefined) ?? [];
    }, [computerState?.shortcuts, visitorShortcutsOverride]);

    const overlayCurrency = authedUser?.currency ?? 0;
    const overlayNextReward = authedUser?.nextRewardAt ?? undefined;
    const overlayLoginStreak = authedUser?.loginStreak ?? undefined;
    const overlayDisplayName = visitorIdentity.name;
    const overlayUsername = clerkUser?.username ?? "you";
    const overlayCursorColor = visitorIdentity.cursorColor;

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

    // Loading state
    if (roomData === undefined) {
        return (
            <div className="h-screen w-screen flex items-center justify-center font-['Patrick_Hand'] text-xl">
                Loading room...
            </div>
        );
    }

    // No friendship or no active room
    if (roomData === null) {
        return (
            <div className="h-screen w-screen flex flex-col items-center justify-center font-['Patrick_Hand'] text-xl gap-4">
                <p>Friend room not found</p>
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
                isGuest={false}
                isComputerOpen={isComputerOpen}
                onCloseComputer={() => setIsComputerOpen(false)}
                shortcuts={overlayShortcuts}
                onUpdateShortcuts={(next) => {
                    setVisitorShortcutsOverride(next);
                    saveComputer({ shortcuts: next, cursorColor: overlayCursorColor });
                }}
                userCurrency={overlayCurrency}
                nextRewardAt={overlayNextReward}
                loginStreak={overlayLoginStreak}
                onPointerMove={updateCursorFromClient}
                guestCoins={0}
                onGuestCoinsChange={() => {}}
                startingCoins={GUEST_STARTING_COINS}
                guestInventory={[]}
                onGuestPurchase={() => {}}
                isOnboardingShopStep={false}
                displayName={overlayDisplayName}
                username={overlayUsername}
                onDisplayNameUpdated={(next) => setVisitorDisplayNameOverride(next)}
                cursorColor={overlayCursorColor}
                onCursorColorChange={(next) => {
                    const value = next?.trim();
                    if (!value) return;
                    setVisitorCursorColorOverride(value);
                    saveComputer({ shortcuts: overlayShortcuts, cursorColor: value });
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
