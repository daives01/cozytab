import type { Doc } from "@convex/_generated/dataModel";
import type { RoomItem } from "@shared/guestTypes";
import type { GuestSessionState } from "@shared/guestTypes";

type HydratedRoom = (Doc<"rooms"> & { template?: Doc<"roomTemplates"> | null }) | null | undefined;
type GuestDefaultRoom = { template: Doc<"roomTemplates">; items: RoomItem[] } | null | undefined;
type DefaultTemplate = Doc<"roomTemplates"> | null | undefined;

type GateArgs = {
    isGuest: boolean;
    initialGuestSession: GuestSessionState | null;
    room: HydratedRoom;
    guestTemplate: DefaultTemplate;
    guestRoom: GuestDefaultRoom;
};

export function useRoomGate({ isGuest, initialGuestSession, room, guestTemplate, guestRoom }: GateArgs) {
    const showGuestFallback = (room === undefined || room === null) && Boolean(initialGuestSession);

    if (
        (!isGuest && !room && !showGuestFallback) ||
        (isGuest && (guestTemplate === undefined || guestRoom === undefined))
    ) {
        return (
            <div className="h-screen w-screen flex items-center justify-center font-['Patrick_Hand'] text-size-xl">
                Loading your cozytab...
            </div>
        );
    }

    if (isGuest && guestTemplate === null && guestRoom === null) {
        return (
            <div className="h-screen w-screen flex items-center justify-center font-['Patrick_Hand'] text-size-xl">
                Uh oh! Something went wrong. Please try again later.
            </div>
        );
    }

    return null;
}

