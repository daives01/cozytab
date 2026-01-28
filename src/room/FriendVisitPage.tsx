import { useCallback, useMemo, useRef, useState } from "react";
import { useUser, SignInButton } from "@clerk/clerk-react";
import { useQuery, useMutation } from "convex/react";
import { Link, useParams } from "react-router-dom";
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
import { GUEST_STARTING_COINS } from "@shared/guestTypes";
import { usePresenceAndChat } from "@/presence/usePresenceChat";
import { RoomShell } from "./components/RoomShell";
import { VisitorRoomItems } from "./components/VisitorRoomItems";
import { VisitorHeader } from "./components/VisitorHeader";
import { ConnectionBanner } from "./components/ConnectionBanner";
import { VisitorMusicModal } from "@/musicPlayer/VisitorMusicModal";
import { ChatHint } from "./components/ChatHint";
import { ComputerOverlay } from "@/computer/ComputerOverlay";
import { GameOverlay } from "@/games/components/GameOverlay";

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

    // Convex IDs are non-empty alphanumeric-ish strings; reject obvious garbage early
    const isPlausibleId = friendUserId && /^[a-zA-Z0-9_-]+$/.test(friendUserId);
    if (!isPlausibleId) {
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

    if (authedUser === null) {
        return (
            <div className="h-screen w-screen flex flex-col items-center justify-center font-['Patrick_Hand'] text-xl gap-4">
                <p>Unable to load your profile</p>
                <Link to="/">
                    <Button>
                        <Home className="mr-2 h-4 w-4" />
                        Go Home
                    </Button>
                </Link>
            </div>
        );
    }

    // If visiting own room, redirect to RoomPage
    if (authedUser._id === friendUserId) {
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
    usePresenceHeartbeat(true);

    const roomData = useQuery(api.friends.getFriendRoom, { friendUserId });
    const computerState = useQuery(api.users.getMyComputer);
    const catalogItems = useQuery(api.catalog.list);
    const saveComputer = useMutation(api.users.saveMyComputer);

    const { scale } = useRoomViewportScale();
    const containerRef = useRef<HTMLDivElement | null>(null);

    const [isComputerOpen, setIsComputerOpen] = useState(false);
    const [visitorShortcutsOverride, setVisitorShortcutsOverride] = useState<Shortcut[] | null>(null);
    const [visitorCursorColorOverride, setVisitorCursorColorOverride] = useState<string | null>(null);
    const [visitorDisplayNameOverride, setVisitorDisplayNameOverride] = useState<string | null>(null);
    const [fallbackCursorColor] = useState(() => randomBrightColor());
    const { timeOfDay, overrideTimeOfDay, setOverrideTimeOfDay } = useTimeOfDayControls();
    const items = roomData?.room?.items as RoomItem[] | undefined;

    const {
        visitorMusicState,
        activeMusicItem,
        setActiveMusicItemId,
        handleMusicToggle,
    } = useVisitorMusic(items);

    const visitorIdentity = useMemo(() => ({
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
    }), [
        clerkUser?.id, clerkUser?.username,
        visitorDisplayNameOverride, authedUser?.displayName, authedUser?.username,
        visitorCursorColorOverride, authedUser?.cursorColor, computerState?.cursorColor,
        fallbackCursorColor,
    ]);

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

    const roomBackgroundImageUrl = useRoomBackgroundImageUrl(roomData?.room?.template?.backgroundUrl, timeOfDay);
    useCozyCursor(true);
    useCursorColor(visitorIdentity.cursorColor);

    const { updateCursorFromClient, handleMouseEvent } = useVisitorCursorTracking({
        containerRef,
        scale,
        updateCursor,
    });

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
                onGuestCoinsChange={() => { }}
                startingCoins={GUEST_STARTING_COINS}
                guestInventory={[]}
                onGuestPurchase={() => { }}
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
