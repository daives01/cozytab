import type { Doc } from "@convex/_generated/dataModel";
import type { RoomItem } from "@shared/guestTypes";
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
        return (
            <div className="min-h-screen min-w-screen bg-[var(--paper)] text-[var(--ink)] flex items-center justify-center p-6 font-['Patrick_Hand']">
                <div className="max-w-md w-full bg-[var(--card)] border-4 border-[var(--ink)] rounded-2xl shadow-[var(--shadow-ink-strong)] p-6 rotate-1 text-center space-y-3">
                    <div className="text-2xl">Desktop only (for now)</div>
                    <p className="text-lg leading-relaxed">
                        Cozytab needs a bit more room. Please visit on a desktop or widen your browser to continue.
                    </p>
                </div>
            </div>
        );
    }

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

