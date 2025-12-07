import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useUser } from "@clerk/clerk-react";
import { useQuery, useMutation } from "convex/react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAtomValue, useSetAtom } from "jotai";
import { ItemNode } from "./ItemNode";
import { MusicPlayerButtons } from "./MusicPlayerButtons";
import { PresenceCursor } from "./PresenceCursor";
import { LocalCursor } from "./LocalCursor";
import { useWebSocketPresence } from "../hooks/useWebSocketPresence";
import { ChatInput } from "./ChatInput";
import { Button } from "@/components/ui/button";
import { Home, Users } from "lucide-react";
import { RoomCanvas } from "./RoomCanvas";
import type { ComputerShortcut, RoomItem } from "../types";
import { api } from "../../convex/_generated/api";
import { useResolvedBackgroundUrl } from "./hooks/useResolvedBackgroundUrl";
import { useRoomScale } from "./hooks/useRoomScale";
import { useCozyCursor } from "./hooks/useCozyCursor";
import { useCursorColor } from "./hooks/useCursorColor";
import { ROOM_HEIGHT, ROOM_WIDTH } from "./roomConstants";
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

const nowTimestamp = () => Date.now();

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
    const updateMusicState = useMutation(api.rooms.updateMusicState);
    const cleanupRoomLease = useMutation(api.rooms.cleanupRoomLease);
    const saveComputer = useMutation(api.users.saveMyComputer);
    const navigate = useNavigate();

    const scale = useRoomScale(ROOM_WIDTH, ROOM_HEIGHT);
    const containerRef = useRef<HTMLDivElement>(null);

    const [guestVisitorId] = useState(() => `visitor-${crypto.randomUUID()}`);
    const [guestVisitorName] = useState(() => `Visitor ${Math.floor(Math.random() * 1000)}`);
    const [guestCursorColor] = useState(() => randomBrightColor());
    const [isComputerOpen, setIsComputerOpen] = useState(false);
    const [visitorShortcutsOverride, setVisitorShortcutsOverride] = useState<ComputerShortcut[] | null>(null);
    const [visitorCursorColorOverride, setVisitorCursorColorOverride] = useState<string | null>(null);
    const [visitorDisplayNameOverride, setVisitorDisplayNameOverride] = useState<string | null>(null);

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

    const visitorIdentity = useMemo(() => {
        const id = isSignedIn && clerkUser?.id ? clerkUser.id : guestVisitorId;
        const baseName =
            authedUser?.displayName ??
            authedUser?.username ??
            clerkUser?.username ??
            guestVisitorName;
        const name = visitorDisplayNameOverride ?? baseName;
        const baseCursorColor = isGuestVisitor
            ? guestCursorColorValue ?? guestCursorColor
            : computerState?.cursorColor ?? authedUser?.cursorColor ?? guestCursorColor;
        const cursorColor = visitorCursorColorOverride ?? baseCursorColor;

        return { id, name, cursorColor };
    }, [
        authedUser?.cursorColor,
        authedUser?.displayName,
        authedUser?.username,
        clerkUser?.id,
        clerkUser?.username,
        computerState?.cursorColor,
        guestCursorColor,
        guestCursorColorValue,
        guestVisitorId,
        guestVisitorName,
        isGuestVisitor,
        isSignedIn,
        visitorCursorColorOverride,
        visitorDisplayNameOverride,
    ]);
    const [roomClosedOverride, setRoomClosedOverride] = useState(false);
    const roomClosed =
        roomClosedOverride || roomData?.closed === true || roomStatus?.status !== "open";
    const presenceRoomId =
        roomStatus?.status === "open" && !roomData?.closed && !roomClosed
            ? roomData?.room?._id ?? null
            : null;

    const { visitors, updateCursor, updateChatMessage, screenCursor, localChatMessage } = useWebSocketPresence(
        presenceRoomId,
        visitorIdentity.id,
        visitorIdentity.name,
        false,
        visitorIdentity.cursorColor
    );
    const backgroundUrl = useResolvedBackgroundUrl(roomData?.room?.template?.backgroundUrl);
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
        if (!roomStatus) return;
        if (roomStatus.status === "open") return;

        cleanupRoomLease({ roomId: roomData.room._id }).catch(() => {});
        const timer = setTimeout(() => navigate("/"), 1500);
        return () => clearTimeout(timer);
    }, [cleanupRoomLease, navigate, roomData?.room?._id, roomStatus]);

    useEffect(() => {
        if (!roomData?.room?._id) return;
        if (roomClosed) return;
        if (roomStatus?.status !== "open") return;

        const closesAt = roomStatus.closesAt;
        if (!closesAt) return;

        const delay = closesAt - Date.now();
        if (delay <= 0) {
            setTimeout(() => setRoomClosedOverride(true), 0);
            cleanupRoomLease({ roomId: roomData.room._id }).catch(() => {});
            navigate("/");
            return;
        }

        const timer = setTimeout(() => {
            setRoomClosedOverride(true);
            cleanupRoomLease({ roomId: roomData.room._id }).catch(() => {});
            navigate("/");
        }, delay);

        return () => clearTimeout(timer);
    }, [cleanupRoomLease, navigate, roomClosed, roomData?.room?._id, roomStatus?.closesAt, roomStatus?.status]);

    const handleMusicToggle = (itemId: string, playing: boolean) => {
        if (!roomData?.room?._id) return;
        if (roomClosed || roomStatus?.status !== "open") return;
        updateMusicState({
            roomId: roomData.room._id,
            itemId,
            musicPlaying: playing,
            musicStartedAt: playing ? nowTimestamp() : 0,
            musicPositionAtStart: 0,
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
                <p>The host stepped away. Redirecting...</p>
                <Link to="/">
                    <Button>
                        <Home className="mr-2 h-4 w-4" />
                        Go Home
                    </Button>
                </Link>
            </div>
        );
    }

    const items = roomData.room.items as RoomItem[];

    const roomContent = (
        <>
            {items.map((item) => (
                <ItemNode
                    key={item.id}
                    item={item}
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
                                key={`music-${item.id}-${item.musicUrl ?? "none"}`}
                                item={item}
                                onToggle={(playing) => handleMusicToggle(item.id, playing)}
                            />
                        ) : null
                    }
                />
            ))}

            {visitors
                .filter((v) => v.visitorId !== visitorIdentity.id)
                .map((visitor) => (
                    <PresenceCursor
                        key={visitor.visitorId}
                        name={visitor.displayName}
                        isOwner={visitor.isOwner}
                        x={visitor.x}
                        y={visitor.y}
                        chatMessage={visitor.chatMessage}
                        scale={scale}
                        cursorColor={visitor.cursorColor}
                    />
                ))}
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

            <div className="absolute bottom-4 left-4 z-50 pointer-events-none">
                <div className="bg-[var(--ink)]/80 text-white text-sm px-3 py-1.5 rounded-lg backdrop-blur-sm border-2 border-[var(--ink)] shadow-sm">
                    <span className="font-mono bg-[var(--ink-light)] px-1.5 py-0.5 rounded text-xs mr-1.5">/</span>
                    <span style={{ fontFamily: "'Patrick Hand', cursive" }}>to chat</span>
                </div>
            </div>

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
                onGuestPurchase={(itemId) =>
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
            />
        </>
    );

    return (
        <RoomCanvas
            backgroundUrl={backgroundUrl}
            scale={scale}
            containerRef={containerRef}
            onMouseMove={handleMouseEvent}
            onMouseEnter={handleMouseEvent}
            roomContent={roomContent}
            overlays={overlays}
        />
    );
}
