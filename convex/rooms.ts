import { mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { v } from "convex/values";

// Heartbeat TTL slightly larger than interval buffer.
const LEASE_TTL_MS = 7 * 60 * 1000;
const HOST_ONLY_TIMEOUT_MS = 10 * 60 * 1000;
const HOST_ONLY_INACTIVE_ERROR = "host-only-timeout";

const MAX_ROOM_ITEMS = 50;
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
        throw new Error("Too many items");
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
            normalized.url = clampStringLength(item.url, MAX_URL_LENGTH);
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

async function getUser(ctx: QueryCtx | MutationCtx) {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    return await ctx.db
        .query("users")
        .withIndex("by_externalId", (q) => q.eq("externalId", identity.subject))
        .unique();
}

async function getPrimaryInviteForRoom(ctx: QueryCtx | MutationCtx, roomId: Id<"rooms">) {
    const invites = await ctx.db
        .query("roomInvites")
        .withIndex("by_room", (q) => q.eq("roomId", roomId))
        .collect();
    if (invites.length === 0) return null;
    const [latest] = invites.sort((a, b) => b.createdAt - a.createdAt);
    return latest;
}

function isInviteOpen(invite: { expiresAt?: number | null }, now: number) {
    if (invite.expiresAt === undefined || invite.expiresAt === null) return false;
    return invite.expiresAt > now;
}

async function requireAuth(ctx: QueryCtx | MutationCtx) {
    const user = await getUser(ctx);
    if (!user) throw new Error("Not authenticated");
    return user;
}

async function getRoomOrThrow(ctx: QueryCtx | MutationCtx, roomId: Id<"rooms">) {
    const room = await ctx.db.get(roomId);
    if (!room) throw new Error("Room not found");
    return room;
}

function assertRoomOwner(room: { userId: Id<"users"> }, user: { _id: Id<"users"> }) {
    if (room.userId !== user._id) throw new Error("Forbidden");
}

function assertRoomActive(room: { isActive: boolean }) {
    if (!room.isActive) throw new Error("Room is inactive");
}

function computeHostOnlySince(hasGuests: boolean, existingHostOnlySince: number | undefined, now: number) {
    return hasGuests ? undefined : existingHostOnlySince ?? now;
}

function hasHostOnlyExpired(hostOnlySince: number | undefined, now: number) {
    if (!hostOnlySince) return false;
    return now - hostOnlySince >= HOST_ONLY_TIMEOUT_MS;
}

export const getMyActiveRoom = query({
    args: {},
    handler: async (ctx) => {
        const user = await getUser(ctx);
        if (!user) return null;

        const rooms = await ctx.db
            .query("rooms")
            .withIndex("by_user_active", (q) => 
                q.eq("userId", user._id).eq("isActive", true)
            )
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
        const user = await getUser(ctx);
        if (!user) return [];

        const rooms = await ctx.db
            .query("rooms")
            .withIndex("by_user", (q) => q.eq("userId", user._id))
            .collect();

        const roomsWithTemplates = await Promise.all(
            rooms.map(async (room) => {
                const template = await ctx.db.get(room.templateId);
                return { ...room, template };
            })
        );

        return roomsWithTemplates;
    },
});

export const createRoom = mutation({
    args: {
        templateId: v.optional(v.id("roomTemplates")),
    },
    handler: async (ctx, args) => {
        const user = await getUser(ctx);
        if (!user) throw new Error("Not authenticated");

        let templateId = args.templateId;
        if (!templateId) {
            const defaultTemplates = await ctx.db
                .query("roomTemplates")
                .withIndex("by_default", (q) => q.eq("isDefault", true))
                .collect();
            
            if (defaultTemplates.length === 0) {
                throw new Error("No default room template found. Please seed the default template first.");
            }
            templateId = defaultTemplates[0]._id;
        }

        const template = await ctx.db.get(templateId);
        if (!template) throw new Error("Template not found");

        const roomsForTemplate = await ctx.db
            .query("rooms")
            .withIndex("by_user_template", (q) =>
                q.eq("userId", user._id).eq("templateId", templateId)
            )
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
        const user = await requireAuth(ctx);
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
        const user = await requireAuth(ctx);
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
            const remainingRooms = allRooms.filter(r => r._id !== args.roomId);
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
        const user = await requireAuth(ctx);
        const room = await getRoomOrThrow(ctx, args.roomId);
        assertRoomOwner(room, user);

        await ctx.db.patch(args.roomId, { name: args.name });
        return { success: true };
    },
});

export const saveMyRoom = mutation({
    args: {
        roomId: v.id("rooms"),
        items: v.array(
            v.object({
                id: v.string(),
                catalogItemId: v.id("catalogItems"),
                x: v.number(),
                y: v.number(),
                url: v.optional(v.string()),
                flipped: v.optional(v.boolean()),
                musicUrl: v.optional(v.string()),
                musicType: v.optional(v.literal("youtube")),
                musicPlaying: v.optional(v.boolean()),
                musicStartedAt: v.optional(v.number()),
                musicPositionAtStart: v.optional(v.number()),
            })
        ),
    },
    handler: async (ctx, args) => {
        const room = await getRoomOrThrow(ctx, args.roomId);
        const user = await requireAuth(ctx);
        assertRoomOwner(room, user);
        assertRoomActive(room);

        const catalogItems = await ctx.db.query("catalogItems").collect();
        const validCatalogIds = new Set<Id<"catalogItems">>(catalogItems.map((item) => item._id));

        const normalizedItems = normalizeRoomItems(args.items as RoomItem[], validCatalogIds);

        await ctx.db.patch(args.roomId, { items: normalizedItems });
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

        const owner = await ctx.db.get(room.userId);
        const template = await ctx.db.get(room.templateId);

        return {
            room: { ...room, template },
            ownerName: owner?.displayName ?? owner?.username ?? "Unknown",
            ownerReferralCode: owner?.referralCode ?? null,
            closed: !inviteOpen,
        };
    },
});

async function heartbeatRoom(
    ctx: MutationCtx,
    args: {
        roomId: Id<"rooms">;
        hasGuests?: boolean;
    }
) {
    const user = await requireAuth(ctx);
    const room = await getRoomOrThrow(ctx, args.roomId);
    assertRoomOwner(room, user);
    assertRoomActive(room);

    const now = Date.now();

    // Update lastSeenAt for online status
    await ctx.db.patch(user._id, { lastSeenAt: now });
    const expiresAt = now + LEASE_TTL_MS;
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

// Temporary stub to quiet stale clients still calling the old endpoint.
export const renewLease = mutation({
    args: {
        roomId: v.id("rooms"),
        hasGuests: v.optional(v.boolean()),
    },
    handler: async () => {
        return { closed: true as const, reason: "deprecated" as const };
    },
});

export const closeInviteSession = mutation({
    args: {
        roomId: v.id("rooms"),
    },
    handler: async (ctx, args) => {
        const user = await requireAuth(ctx);
        const room = await getRoomOrThrow(ctx, args.roomId);
        assertRoomOwner(room, user);
        assertRoomActive(room);

        const now = Date.now();
        const invite = await getPrimaryInviteForRoom(ctx, args.roomId);
        if (invite) {
            await ctx.db.patch(invite._id, {
                expiresAt: now,
                hostOnlySince: undefined,
            });
        }

        return { closed: true as const, expiresAt: now };
    },
});

export const heartbeatPresence = mutation({
    args: {},
    handler: async (ctx) => {
        const user = await requireAuth(ctx);
        await ctx.db.patch(user._id, { lastSeenAt: Date.now() });
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


