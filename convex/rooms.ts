import { mutation, query } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { ConvexError, v } from "convex/values";
import { getCurrentUser, requireUser } from "./lib/auth";
import { assertRoomActive, assertRoomOwner, getRoomOrThrow } from "./lib/roomAccess";
import {
    INVITE_TTL_MS,
    closePrimaryInvite,
    computeHostOnlySince,
    getPrimaryInviteForRoom,
    hasHostOnlyExpired,
    isInviteOpen,
} from "./lib/inviteLifecycle";
import { MAX_ROOM_ITEMS, ROOM_FULL_MESSAGE } from "@shared/roomLimits";
import { roomItemValidator } from "./validators/room";
import { normalizeRoomItemUrl } from "../shared/roomItemUrl";

// Heartbeat TTL slightly larger than interval buffer.
const HOST_ONLY_INACTIVE_ERROR = "host-only-timeout";

const MIN_POSITION = 0;
const MAX_X_POSITION = 1700;
const MAX_Y_POSITION = 1400;
const MAX_URL_LENGTH = 2048;
const MAX_TIME_POSITION_MS = Number.MAX_SAFE_INTEGER;

type RoomItem = {
    id: string;
    catalogItemId: Id<"catalogItems">;
    x: number;
    y: number;
    url?: string;
    flipped?: boolean;
    musicUrl?: string;
    musicType?: "youtube";
    musicPlaying?: boolean;
    musicStartedAt?: number;
    musicPositionAtStart?: number;
};

function clampNumber(value: number, min: number, max: number) {
    if (!Number.isFinite(value)) return min;

    return Math.min(max, Math.max(min, value));
}

function clampNonNegative(value: number | undefined) {
    if (value === undefined) return undefined;

    return clampNumber(value, 0, MAX_TIME_POSITION_MS);
}

function clampStringLength(value: string, maxLength: number) {
    if (value.length <= maxLength) return value;

    return value.slice(0, maxLength);
}

function normalizeRoomItems(items: RoomItem[], validCatalogIds: Set<Id<"catalogItems">>): RoomItem[] {
    if (items.length > MAX_ROOM_ITEMS) {
        throw new Error(ROOM_FULL_MESSAGE);
    }

    return items.map((item, index) => {
        if (!validCatalogIds.has(item.catalogItemId)) {
            throw new Error(`Invalid catalog item: ${item.catalogItemId} at index ${index}`);
        }

        const normalized: RoomItem = {
            id: item.id,
            catalogItemId: item.catalogItemId,
            x: clampNumber(item.x, MIN_POSITION, MAX_X_POSITION),
            y: clampNumber(item.y, MIN_POSITION, MAX_Y_POSITION),
        };

        if (item.url !== undefined) {
            const url = normalizeRoomItemUrl(item.url);

            if (!url) throw new Error(`Invalid room item URL at index ${index}`);
            normalized.url = url;
        }

        if (item.flipped !== undefined) {
            normalized.flipped = item.flipped;
        }

        if (item.musicUrl !== undefined) {
            normalized.musicUrl = clampStringLength(item.musicUrl, MAX_URL_LENGTH);
        }

        if (item.musicType === "youtube") {
            normalized.musicType = "youtube";
        }

        if (item.musicPlaying !== undefined) {
            normalized.musicPlaying = item.musicPlaying;
        }

        if (item.musicStartedAt !== undefined) {
            normalized.musicStartedAt = clampNonNegative(item.musicStartedAt);
        }

        if (item.musicPositionAtStart !== undefined) {
            normalized.musicPositionAtStart = clampNonNegative(item.musicPositionAtStart);
        }

        return normalized;
    });
}

export const getMyActiveRoom = query({
    args: {},
    handler: async (ctx) => {
        const user = await getCurrentUser(ctx);

        if (!user) return null;

        const rooms = await ctx.db
            .query("rooms")
            .withIndex("by_user_active", (q) => q.eq("userId", user._id).eq("isActive", true))
            .collect();

        const room = rooms[0];

        if (!room) return null;

        const template = await ctx.db.get(room.templateId);

        return {
            ...room,
            template,
        };
    },
});

export const getDefaultRoom = query({
    args: {},
    handler: async (ctx) => {
        const defaultTemplate = await ctx.db
            .query("roomTemplates")
            .withIndex("by_default", (q) => q.eq("isDefault", true))
            .unique();

        if (!defaultTemplate) {
            throw new Error("Default room template not found");
        }

        return {
            template: defaultTemplate,
            items: [],
        };
    },
});

export const getMyRooms = query({
    args: {},
    handler: async (ctx) => {
        const user = await getCurrentUser(ctx);

        if (!user) return [];

        const rooms = await ctx.db
            .query("rooms")
            .withIndex("by_user", (q) => q.eq("userId", user._id))
            .collect();

        const roomsWithTemplates = await Promise.all(
            rooms.map(async (room) => {
                const template = await ctx.db.get(room.templateId);

                return { ...room, template };
            }),
        );

        return roomsWithTemplates;
    },
});

export const createRoom = mutation({
    args: {
        templateId: v.optional(v.id("roomTemplates")),
    },
    handler: async (ctx, args) => {
        const user = await requireUser(ctx);

        let templateId = args.templateId;

        if (!templateId) {
            const defaultTemplates = await ctx.db
                .query("roomTemplates")
                .withIndex("by_default", (q) => q.eq("isDefault", true))
                .collect();

            if (defaultTemplates.length === 0) {
                throw new ConvexError("No default room template found. Please seed the default template first.");
            }

            templateId = defaultTemplates[0]._id;
        }

        const template = await ctx.db.get(templateId);

        if (!template) throw new ConvexError("Template not found");

        const roomsForTemplate = await ctx.db
            .query("rooms")
            .withIndex("by_user_template", (q) => q.eq("userId", user._id).eq("templateId", templateId))
            .collect();

        if (roomsForTemplate.length > 0) {
            const activeRoom = roomsForTemplate.find((room) => room.isActive);

            return activeRoom?._id ?? roomsForTemplate[0]._id;
        }

        const allRoomsForUser = await ctx.db
            .query("rooms")
            .withIndex("by_user", (q) => q.eq("userId", user._id))
            .collect();

        const id = await ctx.db.insert("rooms", {
            userId: user._id,
            templateId,
            name: template.name,
            isActive: allRoomsForUser.length === 0,
            items: [],
        });

        return id;
    },
});

export const setActiveRoom = mutation({
    args: { roomId: v.id("rooms") },
    handler: async (ctx, args) => {
        const user = await requireUser(ctx);
        const targetRoom = await getRoomOrThrow(ctx, args.roomId);
        assertRoomOwner(targetRoom, user);

        const allRooms = await ctx.db
            .query("rooms")
            .withIndex("by_user", (q) => q.eq("userId", user._id))
            .collect();

        const hasSingleRoom = allRooms.length <= 1;

        if (hasSingleRoom) {
            if (!targetRoom.isActive) {
                await ctx.db.patch(args.roomId, { isActive: true });
            }

            return { success: true };
        }

        if (targetRoom.isActive) {
            return { success: true };
        }

        for (const room of allRooms) {
            if (room._id !== args.roomId && room.isActive) {
                await ctx.db.patch(room._id, { isActive: false });
            }
        }

        await ctx.db.patch(args.roomId, { isActive: true });

        return { success: true };
    },
});

export const deleteRoom = mutation({
    args: { roomId: v.id("rooms") },
    handler: async (ctx, args) => {
        const user = await requireUser(ctx);
        const targetRoom = await getRoomOrThrow(ctx, args.roomId);
        assertRoomOwner(targetRoom, user);

        const allRooms = await ctx.db
            .query("rooms")
            .withIndex("by_user", (q) => q.eq("userId", user._id))
            .collect();

        if (allRooms.length <= 1) {
            return { success: false, message: "Cannot delete your last room" };
        }

        const wasActive = targetRoom.isActive;

        await ctx.db.delete(args.roomId);

        if (wasActive) {
            const remainingRooms = allRooms.filter((r) => r._id !== args.roomId);

            if (remainingRooms.length > 0) {
                await ctx.db.patch(remainingRooms[0]._id, { isActive: true });
            }
        }

        return { success: true };
    },
});

export const renameRoom = mutation({
    args: {
        roomId: v.id("rooms"),
        name: v.string(),
    },
    handler: async (ctx, args) => {
        const user = await requireUser(ctx);
        const room = await getRoomOrThrow(ctx, args.roomId);
        assertRoomOwner(room, user);

        await ctx.db.patch(args.roomId, { name: args.name });

        return { success: true };
    },
});

export const saveMyRoom = mutation({
    args: {
        roomId: v.id("rooms"),
        items: v.array(roomItemValidator),
    },
    handler: async (ctx, args) => {
        const room = await getRoomOrThrow(ctx, args.roomId);
        const user = await requireUser(ctx);
        assertRoomOwner(room, user);
        assertRoomActive(room);

        const catalogItems = await ctx.db.query("catalogItems").collect();
        const validCatalogIds = new Set<Id<"catalogItems">>(catalogItems.map((item) => item._id));

        const inventory = await ctx.db
            .query("inventory")
            .withIndex("by_user", (q) => q.eq("userId", user._id))
            .collect();

        const ownedCounts = new Map<Id<"catalogItems">, number>();

        for (const item of inventory) {
            ownedCounts.set(item.catalogItemId, (ownedCounts.get(item.catalogItemId) ?? 0) + (item.count ?? 1));
        }

        // Starter items have historically been granted implicitly to users whose
        // inventory predates explicit starter grants.
        for (const item of catalogItems) {
            if (item.isStarterItem && !ownedCounts.has(item._id)) {
                ownedCounts.set(item._id, 1);
            }
        }

        const normalizedItems = normalizeRoomItems(args.items as RoomItem[], validCatalogIds);

        const placedCounts = new Map<Id<"catalogItems">, number>();

        for (const item of normalizedItems) {
            placedCounts.set(item.catalogItemId, (placedCounts.get(item.catalogItemId) ?? 0) + 1);
        }

        for (const [catalogItemId, placedCount] of placedCounts) {
            if (placedCount > (ownedCounts.get(catalogItemId) ?? 0)) {
                throw new Error("Room contains items you do not own");
            }
        }

        await ctx.db.patch(args.roomId, { items: normalizedItems });

        return normalizedItems;
    },
});

export const getRoomByInvite = query({
    args: { token: v.string() },
    handler: async (ctx, args) => {
        const invite = await ctx.db
            .query("roomInvites")
            .withIndex("by_code", (q) => q.eq("code", args.token))
            .unique();

        if (!invite) return null;

        const now = Date.now();
        const inviteOpen = isInviteOpen(invite, now);

        const room = await ctx.db.get(invite.roomId);

        if (!room) return null;

        // A closed token reveals only its state, never the room contents.
        if (!inviteOpen) return { closed: true as const };

        const owner = await ctx.db.get(room.userId);
        const template = await ctx.db.get(room.templateId);

        return {
            room: { ...room, template },
            ownerName: owner?.displayName ?? owner?.username ?? "Unknown",
            ownerReferralCode: owner?.referralCode ?? null,
            closed: false as const,
        };
    },
});

async function heartbeatRoom(
    ctx: MutationCtx,
    args: {
        roomId: Id<"rooms">;
        hasGuests?: boolean;
    },
) {
    const user = await requireUser(ctx);
    const room = await getRoomOrThrow(ctx, args.roomId);
    assertRoomOwner(room, user);
    assertRoomActive(room);

    const now = Date.now();

    // Update lastSeenAt for online status
    await ctx.db.patch(user._id, { lastSeenAt: now });
    const expiresAt = now + INVITE_TTL_MS;
    const hasGuests = args.hasGuests ?? false;

    const invite = await getPrimaryInviteForRoom(ctx, args.roomId);

    if (!invite) {
        // No invite means sharing is off; do nothing and keep the room closed.
        return { expiresAt: null, closed: false as const, reason: "invite-missing" as const };
    }

    const inviteRecord = invite;

    const hostOnlySince = computeHostOnlySince(hasGuests, inviteRecord?.hostOnlySince, now);

    // If the host has been alone for too long, close the room.
    if (hasHostOnlyExpired(hostOnlySince, now)) {
        await ctx.db.patch(inviteRecord!._id, {
            expiresAt: now,
            hostOnlySince,
        });

        return { expiresAt: now, closed: true as const, reason: HOST_ONLY_INACTIVE_ERROR };
    }

    // Keep the invite alive.
    if (inviteRecord) {
        await ctx.db.patch(inviteRecord._id, {
            expiresAt,
            hostOnlySince,
        });
    }

    return { expiresAt, closed: false as const };
}

export const heartbeatInvite = mutation({
    args: {
        roomId: v.id("rooms"),
        hasGuests: v.optional(v.boolean()),
    },
    handler: (ctx, args) => heartbeatRoom(ctx, args),
});

export const closeInviteSession = mutation({
    args: {
        roomId: v.id("rooms"),
    },
    handler: async (ctx, args) => {
        const user = await requireUser(ctx);
        const room = await getRoomOrThrow(ctx, args.roomId);
        assertRoomOwner(room, user);
        assertRoomActive(room);

        const { expiresAt } = await closePrimaryInvite(ctx, args.roomId);

        return { closed: true as const, expiresAt };
    },
});

export const heartbeatPresence = mutation({
    args: {},
    returns: v.null(),
    handler: async (ctx) => {
        const user = await requireUser(ctx);
        await ctx.db.patch(user._id, { lastSeenAt: Date.now() });

        return null;
    },
});

export const getRoomStatus = query({
    args: { roomId: v.id("rooms") },
    handler: async (ctx, args) => {
        const room = await ctx.db.get(args.roomId);

        if (!room) return { status: "missing" as const, closesAt: null, hostId: null as Id<"users"> | null };

        if (!room.isActive) {
            return { status: "inactive" as const, closesAt: null, hostId: room.userId };
        }

        const now = Date.now();
        const invite = await getPrimaryInviteForRoom(ctx, args.roomId);
        const inviteOpen = invite ? isInviteOpen(invite, now) : false;
        const closesAt = invite?.expiresAt ?? null;

        return {
            status: inviteOpen ? ("open" as const) : ("stale" as const),
            closesAt,
            hostId: room.userId,
        };
    },
});
