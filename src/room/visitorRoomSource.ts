import type { Id } from "@convex/_generated/dataModel";
import type { RoomItem } from "@shared/guestTypes";

export type VisitorRoomAccess = "open" | "closed";

export interface VisitorRoomSource {
    kind: "invite" | "friend";
    room: {
        _id: Id<"rooms">;
        items: RoomItem[];
        template?: { backgroundUrl?: string } | null;
    };
    ownerName: string;
    ownerReferralCode?: string | null;
    access: VisitorRoomAccess;
}

interface NormalizableRoom {
    _id: Id<"rooms">;
    items: unknown;
    template?: { backgroundUrl?: string } | null;
}

function normalizeRoom(room: NormalizableRoom): VisitorRoomSource["room"] {
    return {
        _id: room._id,
        items: Array.isArray(room.items) ? (room.items as RoomItem[]) : [],
        template: room.template,
    };
}

export function normalizeInviteRoomSource(input: {
    room: NormalizableRoom;
    ownerName: string;
    ownerReferralCode?: string | null;
}): VisitorRoomSource {
    return {
        kind: "invite",
        room: normalizeRoom(input.room),
        ownerName: input.ownerName,
        ownerReferralCode: input.ownerReferralCode ?? undefined,
        access: "open",
    };
}

export function normalizeFriendRoomSource(input: {
    room: NormalizableRoom;
    ownerName: string;
}): VisitorRoomSource {
    return {
        kind: "friend",
        room: normalizeRoom(input.room),
        ownerName: input.ownerName,
        access: "open",
    };
}
