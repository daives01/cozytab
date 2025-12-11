import { DesktopOnlyNotice, LoadingScreen, NoDemoRoom } from "../components/RoomFallbacks";
import type { Doc } from "@convex/_generated/dataModel";
import type { RoomItem } from "@/types";
import type { GuestSessionState } from "@shared/guestTypes";

type HydratedRoom = (Doc<"rooms"> & { template?: Doc<"roomTemplates"> | null }) | null | undefined;
type GuestDefaultRoom = { template: Doc<"roomTemplates">; items: RoomItem[] } | null | undefined;
type DefaultTemplate = Doc<"roomTemplates"> | null | undefined;

type GateArgs = {
    isGuest: boolean;
    viewportWidth: number;
    mobileMaxWidth: number;
    initialGuestSession: GuestSessionState | null;
    room: HydratedRoom;
    guestTemplate: DefaultTemplate;
    guestRoom: GuestDefaultRoom;
};

export function useRoomGate({ isGuest, viewportWidth, mobileMaxWidth, initialGuestSession, room, guestTemplate, guestRoom }: GateArgs) {
    const isTooNarrow = viewportWidth <= mobileMaxWidth;
    const showGuestFallback = (room === undefined || room === null) && Boolean(initialGuestSession);

    if (isTooNarrow) {
        return <DesktopOnlyNotice />;
    }

    if (
        (!isGuest && !room && !showGuestFallback) ||
        (isGuest && (guestTemplate === undefined || guestRoom === undefined))
    ) {
        return <LoadingScreen message="Loading your cozytab..." />;
    }

    if (isGuest && guestTemplate === null && guestRoom === null) {
        return <NoDemoRoom />;
    }

    return null;
}

