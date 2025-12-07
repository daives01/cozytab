import { DesktopOnlyNotice, LoadingScreen, NoDemoRoom } from "../components/RoomFallbacks";

type GateArgs = {
    isGuest: boolean;
    viewportWidth: number;
    mobileMaxWidth: number;
    initialGuestSession: unknown;
    room: unknown | null | undefined;
    guestTemplate: unknown | null | undefined;
    guestRoom: unknown | null | undefined;
};

export function useRoomGate({ isGuest, viewportWidth, mobileMaxWidth, initialGuestSession, room, guestTemplate, guestRoom }: GateArgs) {
    const isTooNarrow = viewportWidth <= mobileMaxWidth;
    const showGuestFallback = (room === undefined || room === null) && Boolean(initialGuestSession);

    if (isTooNarrow) {
        return <DesktopOnlyNotice />;
    }

    if (!isGuest && !room && !showGuestFallback) {
        return <LoadingScreen message="Loading your cozytab..." />;
    }

    if (isGuest && guestTemplate === undefined && guestRoom === undefined) {
        return <LoadingScreen message="Loading cozytab..." />;
    }

    if (isGuest && guestTemplate === null && guestRoom === null) {
        return <NoDemoRoom />;
    }

    return null;
}

