import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useUser } from "@clerk/clerk-react";
import { useQuery, useMutation } from "convex/react";
import { Link, useParams } from "react-router-dom";
import { useAtomValue, useSetAtom } from "jotai";
import { ItemNode } from "./ItemNode";
import { MusicPlayerButtons } from "./MusicPlayerButtons";
import { LocalCursor } from "./LocalCursor";
import { ChatInput } from "./ChatInput";
import { Button } from "@/components/ui/button";
import { Home, Users } from "lucide-react";
import type { ComputerShortcut, RoomItem } from "../types";
import type { Id } from "../../convex/_generated/dataModel";
import { api } from "../../convex/_generated/api";
import { useRoomBackgroundImageUrl } from "./hooks/useRoomBackgroundImageUrl";
import { useRoomScale } from "./hooks/useRoomScale";
import { useCozyCursor } from "./hooks/useCozyCursor";
import { useCursorColor } from "./hooks/useCursorColor";
import { ROOM_HEIGHT, ROOM_WIDTH } from "./roomConstants";
import { useTimeOfDayControls } from "./hooks/useTimeOfDayControls";
import { isMusicItem } from "./roomUtils";
import { randomBrightColor } from "./utils/cursorColor";
import { getReferralCode, saveReferralCode } from "../referralStorage";
import { ComputerOverlay } from "./ComputerOverlay";
import { GUEST_STARTING_COINS } from "../../shared/guestTypes";
import {
    guestCoinsAtom,
    guestCursorColorAtom,
    guestInventoryAtom,
    guestNormalizedShortcutsAtom,
    guestShortcutsAtom,
} from "./guestState";
import { usePresenceAndChat } from "./hooks/usePresenceChat";
import { PresenceLayer } from "./components/PresenceLayer";
import { RoomShell } from "./RoomShell";
import { ChatHint } from "./components/ChatHint";
import { useViewportSize } from "./hooks/useRoomPageEffects";

const musicUrlKey = (item: RoomItem) => `${item.musicType ?? ""}:${item.musicUrl ?? ""}`;

export function VisitorRoomPage() {
    const { token } = useParams<{ token: string }>();
    const roomData = useQuery(api.rooms.getRoomByInvite, token ? { token } : "skip");
    const roomStatus = useQuery(
        api.rooms.getRoomStatus,
        roomData?.room?._id ? { roomId: roomData.room._id } : "skip"
    );
    const { user: clerkUser, isSignedIn } = useUser();
    const authedUser = useQuery(api.users.getMe, isSignedIn ? {} : "skip");
    const computerState = useQuery(api.users.getMyComputer, isSignedIn ? {} : "skip");
    const saveComputer = useMutation(api.users.saveMyComputer);

    const { width: viewportWidth, height: viewportHeight } = useViewportSize();
    const scale = useRoomScale(ROOM_WIDTH, ROOM_HEIGHT, {
        viewportWidth,
        viewportHeight,
        maxScale: 1.25,
    });
    const containerRef = useRef<HTMLDivElement | null>(null);

    const [guestVisitorId] = useState(() => `visitor-${crypto.randomUUID()}`);
    const [guestVisitorName] = useState(() => `Visitor ${Math.floor(Math.random() * 1000)}`);
    const [guestCursorColor] = useState(() => randomBrightColor());
    const [isComputerOpen, setIsComputerOpen] = useState(false);
    const [visitorShortcutsOverride, setVisitorShortcutsOverride] = useState<ComputerShortcut[] | null>(null);
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

    const { visitors, updateCursor, updateChatMessage, screenCursor, localChatMessage } = usePresenceAndChat({
        roomId: presenceRoomId,
        identity: {
            id: visitorIdentity.id,
            name: visitorIdentity.name,
            cursorColor: visitorIdentity.cursorColor,
        },
        isOwner: false,
    });
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
        return (computerState?.shortcuts as ComputerShortcut[] | undefined) ?? [];
    }, [computerState?.shortcuts, guestShortcutsNormalized, isSignedIn, visitorShortcutsOverride]);

    const overlayCurrency = isSignedIn ? authedUser?.currency ?? 0 : guestCoins;
    const overlayNextReward = isSignedIn ? authedUser?.nextRewardAt ?? undefined : undefined;
    const overlayLoginStreak = isSignedIn ? authedUser?.loginStreak ?? undefined : undefined;
    const overlayDisplayName = isSignedIn ? visitorIdentity.name : undefined;
    const overlayUsername = isSignedIn ? clerkUser?.username ?? "you" : undefined;
    const overlayCursorColor = visitorIdentity.cursorColor;

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

    if (roomData === undefined) {
        return (
            <div className="h-screen w-screen flex items-center justify-center font-['Patrick_Hand'] text-xl">
                Loading room...
            </div>
        );
    }

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

                return (
                    <ItemNode
                        key={item.id}
                        item={localMusicItem}
                        isSelected={false}
                        mode="view"
                        scale={scale}
                        onSelect={() => {}}
                        onChange={() => {}}
                        onDragStart={() => {}}
                        onDragEnd={() => {}}
                        onComputerClick={handleOpenComputer}
                        onMusicPlayerClick={() => {}}
                        isVisitor={true}
                        overlay={
                            isMusicItem(item) ? (
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
                            ) : null
                        }
                    />
                );
            })}

            <PresenceLayer visitors={visitors} currentVisitorId={visitorIdentity.id} scale={scale} />
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

            <ChatInput onMessageChange={updateChatMessage} />
            <ChatHint />

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
            roomBackgroundImageUrl={roomBackgroundImageUrl ?? null}
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
