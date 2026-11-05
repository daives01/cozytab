import { useState } from "react";
import { useUser, SignInButton } from "@clerk/clerk-react";
import { useMutation, useQuery } from "convex/react";
import { Link, useParams } from "react-router-dom";
import { Home } from "lucide-react";
import type { Id } from "@convex/_generated/dataModel";
import { api } from "@convex/_generated/api";
import { Button } from "@/components/ui/button";
import { usePresenceHeartbeat } from "@/hooks/usePresenceHeartbeat";
import { RoomPage } from "./RoomPage";
import { useRoomViewportScale } from "./hooks/useRoomViewportScale";
import { useVisitorRoomController } from "./hooks/useVisitorRoomController";
import { normalizeFriendRoomSource } from "./visitorRoomSource";
import { VisitorRoomExperience } from "./components/VisitorRoomExperience";
import { randomBrightColor } from "./utils/cursorColor";

function RouteState({ message, action }: { message: string; action?: React.ReactNode }) {
    return (
        <div className="h-screen w-screen flex flex-col items-center justify-center font-['Patrick_Hand'] text-xl gap-4">
            <p>{message}</p>
            {action}
            <Link to="/">
                <Button variant={action ? "outline" : "default"}>
                    <Home className="mr-2 h-4 w-4" />
                    Go Home
                </Button>
            </Link>
        </div>
    );
}

export function FriendVisitPage() {
    const { friendUserId } = useParams<{ friendUserId: string }>();
    const { isSignedIn, isLoaded, user: clerkUser } = useUser();
    const authedUser = useQuery(api.users.getMe, isSignedIn ? {} : "skip");
    const plausibleId = friendUserId && /^[a-zA-Z0-9_-]+$/.test(friendUserId);

    if (!isLoaded || authedUser === undefined) return <RouteState message="Loading..." />;

    if (!isSignedIn) {
        return (
            <RouteState
                message="You need to sign in to visit a friend's room."
                action={
                    <SignInButton mode="modal">
                        <Button>Sign In</Button>
                    </SignInButton>
                }
            />
        );
    }

    if (!plausibleId) return <RouteState message="Invalid friend link" />;

    if (authedUser === null) return <RouteState message="Unable to load your profile" />;

    if (authedUser._id === friendUserId) return <RoomPage isGuest={false} />;

    return (
        <FriendVisitContent friendUserId={friendUserId as Id<"users">} authedUser={authedUser} clerkUser={clerkUser} />
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
    const [fallbackCursorColor] = useState(() => randomBrightColor());

    if (roomData === undefined) return <RouteState message="Loading room..." />;

    if (roomData === null) return <RouteState message="Friend room not found" />;

    return (
        <FriendRoomExperience
            source={normalizeFriendRoomSource(roomData)}
            authedUser={authedUser}
            clerkUser={clerkUser}
            computerState={computerState}
            catalogItems={catalogItems}
            saveComputer={saveComputer}
            scale={scale}
            fallbackCursorColor={fallbackCursorColor}
        />
    );
}

function FriendRoomExperience({
    source,
    authedUser,
    clerkUser,
    computerState,
    catalogItems,
    saveComputer,
    scale,
    fallbackCursorColor,
}: {
    source: ReturnType<typeof normalizeFriendRoomSource>;
    authedUser: NonNullable<ReturnType<typeof useQuery<typeof api.users.getMe>>>;
    clerkUser: ReturnType<typeof useUser>["user"];
    computerState: ReturnType<typeof useQuery<typeof api.users.getMyComputer>>;
    catalogItems: ReturnType<typeof useQuery<typeof api.catalog.list>>;
    saveComputer: ReturnType<typeof useMutation<typeof api.users.saveMyComputer>>;
    scale: number;
    fallbackCursorColor: string;
}) {
    const controller = useVisitorRoomController({
        source,
        identity: {
            id: clerkUser?.id ?? "",
            name: authedUser.displayName ?? authedUser.username ?? clerkUser?.username ?? "Visitor",
            username: clerkUser?.username ?? undefined,
            cursorColor: authedUser.cursorColor ?? computerState?.cursorColor ?? fallbackCursorColor,
            convexUserId: authedUser._id,
        },
        catalogItems,
        computerState,
        isGuest: false,
        economy: {
            currency: authedUser.currency,
            nextRewardAt: authedUser.nextRewardAt ?? undefined,
            loginStreak: authedUser.loginStreak ?? undefined,
            guestCoins: 0,
            guestInventory: [],
            onGuestCoinsChange: () => undefined,
            onGuestPurchase: () => undefined,
        },
        scale,
        saveComputer: (computer) => void saveComputer(computer),
    });

    return <VisitorRoomExperience controller={controller} />;
}
