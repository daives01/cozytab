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
