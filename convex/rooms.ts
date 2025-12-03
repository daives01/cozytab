import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const getMyRoom = query({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return null;

        const user = await ctx.db
            .query("users")
            .withIndex("by_externalId", (q) =>
                q.eq("externalId", identity.subject)
            )
            .unique();
        if (!user) return null;

        return await ctx.db
            .query("rooms")
            .withIndex("by_user", (q) => q.eq("userId", user._id))
            .unique();
    },
});

export const createRoom = mutation({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Not authenticated");

        const user = await ctx.db
            .query("users")
            .withIndex("by_externalId", (q) =>
                q.eq("externalId", identity.subject)
            )
            .unique();
        if (!user) throw new Error("User not found");

        const existing = await ctx.db
            .query("rooms")
            .withIndex("by_user", (q) => q.eq("userId", user._id))
            .unique();

        if (existing) return existing._id;

        const id = await ctx.db.insert("rooms", {
            userId: user._id,
            name: "My Room",
            backgroundTheme: "default",
            items: [],
            shortcuts: [],
        });
        return id;
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
                scaleX: v.number(),
                scaleY: v.number(),
                rotation: v.number(),
                zIndex: v.number(),
                url: v.optional(v.string()),
                variant: v.optional(v.string()),
                musicUrl: v.optional(v.string()),
                musicType: v.optional(v.union(v.literal("youtube"), v.literal("spotify"))),
                musicPlaying: v.optional(v.boolean()),
                musicStartedAt: v.optional(v.number()),
                musicPositionAtStart: v.optional(v.number()),
            })
        ),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Not authenticated");

        const room = await ctx.db.get(args.roomId);
        if (!room) throw new Error("Room not found");

        const user = await ctx.db
            .query("users")
            .withIndex("by_externalId", (q) =>
                q.eq("externalId", identity.subject)
            )
            .unique();

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
                icon: v.optional(v.string()),
            })
        ),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Not authenticated");

        const room = await ctx.db.get(args.roomId);
        if (!room) throw new Error("Room not found");

        const user = await ctx.db
            .query("users")
            .withIndex("by_externalId", (q) =>
                q.eq("externalId", identity.subject)
            )
            .unique();

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

        return {
            room,
            ownerName: owner?.displayName ?? owner?.username ?? "Unknown",
            ownerId: owner?._id,
        };
    },
});
