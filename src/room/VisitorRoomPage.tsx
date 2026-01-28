import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useUser } from "@clerk/clerk-react";
import { useQuery, useMutation } from "convex/react";
import { Link, useParams } from "react-router-dom";
import { useAtomValue, useSetAtom } from "jotai";
import { LocalCursor } from "@/presence/LocalCursor";
import { ChatInput } from "./ChatInput";
import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";
import type { Shortcut, RoomItem } from "@shared/guestTypes";
import type { Id } from "@convex/_generated/dataModel";
import { api } from "@convex/_generated/api";
import { RoomPage } from "./RoomPage";
import { useRoomBackgroundImageUrl } from "./hooks/useRoomBackgroundImageUrl";
import { useCozyCursor } from "./hooks/useCozyCursor";
import { useCursorColor } from "./hooks/useCursorColor";
import { useRoomViewportScale } from "./hooks/useRoomViewportScale";
import { useVisitorMusic } from "./hooks/useVisitorMusic";
import { useVisitorGameState } from "./hooks/useVisitorGameState";
import { useVisitorCursorTracking } from "./hooks/useVisitorCursorTracking";
import { useTimeOfDayControls } from "@/hooks/useTimeOfDayControls";
import { usePresenceHeartbeat } from "@/hooks/usePresenceHeartbeat";
import { randomBrightColor } from "./utils/cursorColor";
import { getReferralCode, saveReferralCode } from "../referralStorage";
import { GUEST_STARTING_COINS } from "@shared/guestTypes";
import { OnboardingSpotlight } from "./OnboardingSpotlight";
import {
    guestCoinsAtom,
    guestCursorColorAtom,
    guestInventoryAtom,
    guestNormalizedShortcutsAtom,
    guestShortcutsAtom,
} from "@/guest/state/guestAtoms";
import { usePresenceAndChat } from "@/presence/usePresenceChat";
import { RoomShell } from "./components/RoomShell";
import { VisitorRoomItems } from "./components/VisitorRoomItems";
import { VisitorHeader } from "./components/VisitorHeader";
import { ConnectionBanner } from "./components/ConnectionBanner";
import { VisitorMusicModal } from "@/musicPlayer/VisitorMusicModal";
import { ChatHint } from "./components/ChatHint";
import { ComputerOverlay } from "@/computer/ComputerOverlay";
import { GameOverlay } from "@/games/components/GameOverlay";

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
    usePresenceHeartbeat(isSignedIn === true);
    const computerState = useQuery(api.users.getMyComputer, isSignedIn ? {} : "skip");
    const catalogItems = useQuery(api.catalog.list);
    const saveComputer = useMutation(api.users.saveMyComputer);

    const { scale } = useRoomViewportScale();
    const containerRef = useRef<HTMLDivElement | null>(null);

    const [guestVisitorId] = useState(() => `visitor-${crypto.randomUUID()}`);
    const [guestVisitorName] = useState(() => `Visitor ${Math.floor(Math.random() * 1000)}`);
    const [guestCursorColor] = useState(() => randomBrightColor());
    const [isComputerOpen, setIsComputerOpen] = useState(false);
    const [visitorShortcutsOverride, setVisitorShortcutsOverride] = useState<Shortcut[] | null>(null);
    const [visitorCursorColorOverride, setVisitorCursorColorOverride] = useState<string | null>(null);
    const [visitorDisplayNameOverride, setVisitorDisplayNameOverride] = useState<string | null>(null);
    const { timeOfDay, overrideTimeOfDay, setOverrideTimeOfDay } = useTimeOfDayControls();
    const items = roomData?.room?.items as RoomItem[] | undefined;

    const {
        visitorMusicState,
        activeMusicItem,
        setActiveMusicItemId,
        handleMusicToggle,
    } = useVisitorMusic(items);

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
            convexUserId: authedUser?._id,
        },
        isOwner: false,
    });
    const {
        activeGameItemId,
        setActiveGameItemId,
        activeGameType,
        handleGameActiveChange,
    } = useVisitorGameState({
        items,
        catalogItems,
        isComputerOpen,
        activeMusicItem,
        setInMenu,
        setInGame,
    });
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

    const { updateCursorFromClient, handleMouseEvent } = useVisitorCursorTracking({
        containerRef,
        scale,
        updateCursor,
    });

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
        <VisitorRoomItems
            items={items}
            catalogItems={catalogItems}
            visitorMusicState={visitorMusicState}
            scale={scale}
            onComputerClick={handleOpenComputer}
            onMusicPlayerClick={setActiveMusicItemId}
            onGameClick={setActiveGameItemId}
            onMusicToggle={handleMusicToggle}
            visitors={visitors}
            currentVisitorId={visitorIdentity.id}
            currentGameId={activeGameItemId}
        />
    );

    const overlays = (
        <>
            <VisitorHeader ownerName={roomData.ownerName} visitorCount={visitors.length} />
            <ConnectionBanner connectionState={connectionState} />

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
