import { query, mutation } from "./_generated/server";
import type { QueryCtx, MutationCtx } from "./_generated/server";
import { v } from "convex/values";

async function getUser(ctx: QueryCtx | MutationCtx) {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    return await ctx.db
        .query("users")
        .withIndex("by_externalId", (q) => q.eq("externalId", identity.subject))
        .unique();
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
        const defaultTemplates = await ctx.db
            .query("roomTemplates")
            .withIndex("by_default", (q) => q.eq("isDefault", true))
            .collect();

        const defaultTemplate = defaultTemplates[0];
        if (!defaultTemplate) return null;

        const rooms = await ctx.db.query("rooms").collect();

        // Prefer an active room that uses the default template
        const matchingRoom =
            rooms.find((room) => room.templateId === defaultTemplate._id && room.isActive) ||
            rooms.find((room) => room.templateId === defaultTemplate._id) ||
            null;

        if (!matchingRoom) return null;

        return {
            ...matchingRoom,
            template: defaultTemplate,
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

        const existingRooms = await ctx.db
            .query("rooms")
            .withIndex("by_user", (q) => q.eq("userId", user._id))
            .collect();

        if (existingRooms.length > 0) {
            const activeRoom = existingRooms.find(r => r.isActive);
            return activeRoom?._id ?? existingRooms[0]._id;
        }

        const id = await ctx.db.insert("rooms", {
            userId: user._id,
            templateId,
            name: template.name,
            isActive: true,
            items: [],
            shortcuts: [],
        });
        return id;
    },
});

export const setActiveRoom = mutation({
    args: { roomId: v.id("rooms") },
    handler: async (ctx, args) => {
        const user = await getUser(ctx);
        if (!user) throw new Error("Not authenticated");

        const targetRoom = await ctx.db.get(args.roomId);
        if (!targetRoom) throw new Error("Room not found");
        if (targetRoom.userId !== user._id) throw new Error("Forbidden");

        const allRooms = await ctx.db
            .query("rooms")
            .withIndex("by_user", (q) => q.eq("userId", user._id))
            .collect();

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
        const user = await getUser(ctx);
        if (!user) throw new Error("Not authenticated");

        const targetRoom = await ctx.db.get(args.roomId);
        if (!targetRoom) throw new Error("Room not found");
        if (targetRoom.userId !== user._id) throw new Error("Forbidden");

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
        const user = await getUser(ctx);
        if (!user) throw new Error("Not authenticated");

        const room = await ctx.db.get(args.roomId);
        if (!room) throw new Error("Room not found");
        if (room.userId !== user._id) throw new Error("Forbidden");

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
                catalogItemId: v.string(),
                x: v.number(),
                y: v.number(),
                url: v.optional(v.string()),
                flipped: v.optional(v.boolean()),
                musicUrl: v.optional(v.string()),
                musicType: v.optional(v.union(v.literal("youtube"), v.literal("spotify"))),
                musicPlaying: v.optional(v.boolean()),
                musicStartedAt: v.optional(v.number()),
                musicPositionAtStart: v.optional(v.number()),
            })
        ),
    },
    handler: async (ctx, args) => {
        const room = await ctx.db.get(args.roomId);
        if (!room) throw new Error("Room not found");

        const user = await getUser(ctx);
        if (!user || room.userId !== user._id) {
            throw new Error("Forbidden");
        }

        await ctx.db.patch(args.roomId, { items: args.items });
    },
});

export const saveShortcuts = mutation({
    args: {
        roomId: v.id("rooms"),
        shortcuts: v.array(
            v.object({
                id: v.string(),
                name: v.string(),
                url: v.string(),
            })
        ),
    },
    handler: async (ctx, args) => {
        const room = await ctx.db.get(args.roomId);
        if (!room) throw new Error("Room not found");

        const user = await getUser(ctx);
        if (!user || room.userId !== user._id) {
            throw new Error("Forbidden");
        }

        await ctx.db.patch(args.roomId, { shortcuts: args.shortcuts });
    },
});

// Lightweight mutation for music state updates - allows anyone with room access to update
export const updateMusicState = mutation({
    args: {
        roomId: v.id("rooms"),
        itemId: v.string(),
        musicPlaying: v.boolean(),
        musicStartedAt: v.number(),
        musicPositionAtStart: v.number(),
    },
    handler: async (ctx, args) => {
        const room = await ctx.db.get(args.roomId);
        if (!room) throw new Error("Room not found");

        const updatedItems = room.items.map((item) => {
            if (item.id === args.itemId) {
                return {
                    ...item,
                    musicPlaying: args.musicPlaying,
                    musicStartedAt: args.musicStartedAt,
                    musicPositionAtStart: args.musicPositionAtStart,
                };
            }
            return item;
        });

        await ctx.db.patch(args.roomId, { items: updatedItems });
    },
});

export const getRoomByInvite = query({
    args: { token: v.string() },
    handler: async (ctx, args) => {
        const invite = await ctx.db
            .query("roomInvites")
            .withIndex("by_token", (q) => q.eq("token", args.token))
            .unique();

        if (!invite) return null;
        if (!invite.isActive) return null;
        if (invite.expiresAt && invite.expiresAt < Date.now()) return null;

        const room = await ctx.db.get(invite.roomId);
        if (!room) return null;

        const owner = await ctx.db.get(room.userId);
        const template = await ctx.db.get(room.templateId);

        return {
            room: { ...room, template },
            ownerName: owner?.displayName ?? owner?.username ?? "Unknown",
            ownerId: owner?._id,
        };
    },
});
