import { useCallback, useEffect, useMemo, useState } from "react";
import { useUser } from "@clerk/clerk-react";
import { useMutation, useQuery } from "convex/react";
import { Link, useParams } from "react-router-dom";
import { Home } from "lucide-react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { usePresenceHeartbeat } from "@/hooks/usePresenceHeartbeat";
import { normalizeGuestShortcuts, readGuestSession, saveGuestSession } from "@/guest/guestSession";
import { getReferralCode, saveReferralCode } from "../referralStorage";
import { RoomPage } from "./RoomPage";
import { useRoomViewportScale } from "./hooks/useRoomViewportScale";
import { useMobileZoom } from "./hooks/useMobileZoom";
import { useVisitorRoomController } from "./hooks/useVisitorRoomController";
import { normalizeInviteRoomSource } from "./visitorRoomSource";
import { VisitorRoomExperience } from "./components/VisitorRoomExperience";
import { MobileZoomButton } from "./components/MobileZoomButton";
import { OnboardingSpotlight } from "./OnboardingSpotlight";
import { randomBrightColor } from "./utils/cursorColor";
import { createId } from "@/utils/id";

const VISITOR_CHAT_ONBOARDING_KEY = "cozytab:visitor-chat-onboarding";

function InviteState({ message }: { message: string }) {
    return (
        <div className="h-screen w-screen flex flex-col items-center justify-center font-['Patrick_Hand'] text-xl gap-4">
            <p>{message}</p>
            <Link to="/">
                <Button><Home className="mr-2 h-4 w-4" />Go Home</Button>
            </Link>
        </div>
    );
}

export function VisitorRoomPage() {
    const { token } = useParams<{ token: string }>();
    const { isSignedIn } = useUser();
    const authedUser = useQuery(api.users.getMe, isSignedIn ? {} : "skip");
    const roomData = useQuery(api.rooms.getRoomByInvite, token ? { token } : "skip");
    const ownerLoading = isSignedIn && authedUser === undefined;

    if (!token) return <InviteState message="Invalid invite link" />;
    if (ownerLoading || roomData === undefined) return <InviteState message="Loading room..." />;
    if (roomData === null) return <InviteState message="This invite link is invalid or has expired" />;
    if (roomData.closed) return <InviteState message="The host stepped away." />;
    if (isSignedIn && authedUser?._id === roomData.room.userId) return <RoomPage isGuest={false} />;

    return <InviteRoomContent roomData={roomData} authedUser={authedUser} />;
}

function InviteRoomContent({
    roomData,
    authedUser,
}: {
    roomData: NonNullable<Exclude<ReturnType<typeof useQuery<typeof api.rooms.getRoomByInvite>>, undefined>>;
    authedUser: ReturnType<typeof useQuery<typeof api.users.getMe>>;
}) {
    const { user: clerkUser, isSignedIn } = useUser();
    usePresenceHeartbeat(isSignedIn === true);
    const roomStatus = useQuery(api.rooms.getRoomStatus, { roomId: roomData.room._id });
    const computerState = useQuery(api.users.getMyComputer, isSignedIn ? {} : "skip");
    const catalogItems = useQuery(api.catalog.list);
    const saveComputer = useMutation(api.users.saveMyComputer);
    const { scale, viewportWidth, viewportHeight } = useRoomViewportScale();
    const zoom = useMobileZoom({ baseScale: scale, viewportWidth, viewportHeight });
    const [guestSession, setGuestSession] = useState(() => readGuestSession());
    const [guestVisitorId] = useState(() => `visitor-${createId()}`);
    const [guestVisitorName] = useState(() => `Visitor ${Math.floor(Math.random() * 1000)}`);
    const [fallbackCursorColor] = useState(() => randomBrightColor());
    const [roomClosedOverride, setRoomClosedOverride] = useState(false);
    const [chatOnboardingDismissed, setChatOnboardingDismissed] = useState(() =>
        typeof window !== "undefined" && Boolean(window.localStorage.getItem(VISITOR_CHAT_ONBOARDING_KEY))
    );

    const source = useMemo(() => normalizeInviteRoomSource(roomData), [roomData]);
    const roomClosed = roomClosedOverride || source.access === "closed" || roomStatus?.status !== "open";

    useEffect(() => {
        if (source.ownerReferralCode && !getReferralCode()) saveReferralCode(source.ownerReferralCode);
    }, [source.ownerReferralCode]);

    useEffect(() => {
        if (roomStatus?.status !== "open" || !roomStatus.closesAt) return;
        const delay = roomStatus.closesAt - Date.now();
        const timer = window.setTimeout(() => setRoomClosedOverride(true), Math.max(0, delay));
        return () => window.clearTimeout(timer);
    }, [roomStatus?.closesAt, roomStatus?.status]);

    const updateGuestSession = useCallback((changes: Parameters<typeof saveGuestSession>[0]) => {
        const persisted = saveGuestSession(changes);
        setGuestSession(persisted);
    }, []);

    if (roomStatus === undefined) return <InviteState message="Loading room..." />;
    if (roomClosed) return <InviteState message="The host stepped away." />;

    return (
        <InviteRoomExperience
            source={source}
            authedUser={authedUser}
            clerkUser={clerkUser}
            computerState={computerState}
            catalogItems={catalogItems}
            saveComputer={saveComputer}
            isSignedIn={Boolean(isSignedIn)}
            guestSession={guestSession}
            updateGuestSession={updateGuestSession}
            guestVisitorId={guestVisitorId}
            guestVisitorName={guestVisitorName}
            fallbackCursorColor={fallbackCursorColor}
            zoom={zoom}
            showChatOnboarding={!chatOnboardingDismissed}
            dismissChatOnboarding={() => {
                setChatOnboardingDismissed(true);
                window.localStorage.setItem(VISITOR_CHAT_ONBOARDING_KEY, "1");
            }}
        />
    );
}

function InviteRoomExperience({ source, authedUser, clerkUser, computerState, catalogItems, saveComputer, isSignedIn, guestSession, updateGuestSession, guestVisitorId, guestVisitorName, fallbackCursorColor, zoom, showChatOnboarding, dismissChatOnboarding }: {
    source: ReturnType<typeof normalizeInviteRoomSource>;
    authedUser: ReturnType<typeof useQuery<typeof api.users.getMe>>;
    clerkUser: ReturnType<typeof useUser>["user"];
    computerState: ReturnType<typeof useQuery<typeof api.users.getMyComputer>>;
    catalogItems: ReturnType<typeof useQuery<typeof api.catalog.list>>;
    saveComputer: ReturnType<typeof useMutation<typeof api.users.saveMyComputer>>;
    isSignedIn: boolean;
    guestSession: ReturnType<typeof readGuestSession>;
    updateGuestSession: (changes: Parameters<typeof saveGuestSession>[0]) => void;
    guestVisitorId: string;
    guestVisitorName: string;
    fallbackCursorColor: string;
    zoom: ReturnType<typeof useMobileZoom>;
    showChatOnboarding: boolean;
    dismissChatOnboarding: () => void;
}) {
    const isGuest = !isSignedIn;
    const controller = useVisitorRoomController({
        source,
        identity: {
            id: isSignedIn ? clerkUser?.id ?? "" : guestVisitorId,
            name: authedUser?.displayName ?? authedUser?.username ?? clerkUser?.username ?? guestVisitorName,
            username: clerkUser?.username ?? undefined,
            cursorColor: isGuest
                ? guestSession.cursorColor ?? fallbackCursorColor
                : authedUser?.cursorColor ?? computerState?.cursorColor ?? fallbackCursorColor,
            convexUserId: authedUser?._id,
        },
        catalogItems,
        computerState: isGuest ? { shortcuts: normalizeGuestShortcuts(guestSession.shortcuts), cursorColor: guestSession.cursorColor } : computerState,
        isGuest,
        economy: {
            currency: isSignedIn ? authedUser?.currency ?? 0 : guestSession.coins,
            nextRewardAt: isSignedIn ? authedUser?.nextRewardAt ?? undefined : undefined,
            loginStreak: isSignedIn ? authedUser?.loginStreak ?? undefined : undefined,
            guestCoins: guestSession.coins,
            guestInventory: guestSession.inventoryIds,
            onGuestCoinsChange: (coins) => updateGuestSession({ coins }),
            onGuestPurchase: (catalogItemId: Id<"catalogItems">) =>
                updateGuestSession({ inventoryIds: guestSession.inventoryIds.includes(catalogItemId) ? guestSession.inventoryIds : [...guestSession.inventoryIds, catalogItemId] }),
        },
        scale: zoom.effectiveScale,
        saveComputer: (computer) => void saveComputer(computer),
        saveGuestShortcuts: (shortcuts) => updateGuestSession({ shortcuts }),
        saveGuestCursorColor: (cursorColor) => updateGuestSession({ cursorColor }),
    });

    const handlePointerMove = useCallback((event: React.PointerEvent) => {
        if (event.pointerType !== "touch") return;
        controller.cursor.handlePointerEvent(event);
        if (zoom.zoomLevel > 1) zoom.handlePanMove(event.clientX, event.clientY);
    }, [controller.cursor, zoom]);
    const handlePointerDown = useCallback((event: React.PointerEvent) => {
        if (event.pointerType === "touch" && zoom.zoomLevel > 1) zoom.handlePanStart(event.clientX, event.clientY);
    }, [zoom]);
    const handlePointerUp = useCallback(() => zoom.handlePanEnd(), [zoom]);
    const onboarding = showChatOnboarding ? (
        <OnboardingSpotlight
            message="Press Enter to chat"
            messageContent={<p className="text-size-xl font-medium leading-relaxed text-[var(--color-foreground)]">Press <span className="rounded-lg border-2 border-[var(--color-foreground)] bg-[var(--color-secondary)] px-3 py-1 font-mono shadow-[var(--shadow-3)]">Enter</span> to chat</p>}
            bubblePosition="bottom"
            bubbleWidth={600}
            onSkip={dismissChatOnboarding}
            showSkip={false}
            pulseTarget={false}
            onNext={dismissChatOnboarding}
            showNext
        />
    ) : null;

    return (
        <>
            <VisitorRoomExperience
                controller={controller}
                extraOverlays={onboarding}
                zoomLevel={zoom.zoomLevel}
                panOffset={zoom.panOffset}
                onPointerMove={handlePointerMove}
                onPointerDown={handlePointerDown}
                onPointerUp={handlePointerUp}
            />
            <MobileZoomButton zoomLevel={zoom.zoomLevel} zoomLabel={zoom.zoomLabel} onCycleZoom={zoom.cycleZoom} />
        </>
    );
}
