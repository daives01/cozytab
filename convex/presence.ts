import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

const PRESENCE_TIMEOUT_MS = 10000;

const cursorActionValidator = v.object({
    x: v.number(),
    y: v.number(),
    timeSinceBatchStart: v.number(),
});

export const updatePresence = mutation({
    args: {
        roomId: v.id("rooms"),
        visitorId: v.string(),
        displayName: v.string(),
        isOwner: v.boolean(),
        actions: v.array(cursorActionValidator),
    },
    handler: async (ctx, args) => {
        const existing = await ctx.db
            .query("presence")
            .withIndex("by_room_and_visitor", (q) =>
                q.eq("roomId", args.roomId).eq("visitorId", args.visitorId)
            )
            .unique();

        const actions = args.actions.slice(0, 200);

        if (existing) {
            await ctx.db.patch(existing._id, {
                actions,
                lastSeen: Date.now(),
                displayName: args.displayName,
            });
        } else {
            await ctx.db.insert("presence", {
                roomId: args.roomId,
                visitorId: args.visitorId,
                displayName: args.displayName,
                lastSeen: Date.now(),
                isOwner: args.isOwner,
                actions,
            });
        }

        await ctx.scheduler.runAfter(PRESENCE_TIMEOUT_MS, internal.presence.cleanupStalePresence, {
            roomId: args.roomId,
        });
    },
});

export const getRoomPresence = query({
    args: { roomId: v.id("rooms") },
    handler: async (ctx, args) => {
        const now = Date.now();
        const presenceList = await ctx.db
            .query("presence")
            .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
            .collect();

        return presenceList.filter(
            (p) => now - p.lastSeen < PRESENCE_TIMEOUT_MS
        );
    },
});

export const leaveRoom = mutation({
    args: {
        roomId: v.id("rooms"),
        visitorId: v.string(),
    },
    handler: async (ctx, args) => {
        const existing = await ctx.db
            .query("presence")
            .withIndex("by_room_and_visitor", (q) =>
                q.eq("roomId", args.roomId).eq("visitorId", args.visitorId)
            )
            .unique();

        if (existing) {
            await ctx.db.delete(existing._id);
        }

        return { success: true };
    },
});

export const cleanupStalePresence = internalMutation({
    args: { roomId: v.id("rooms") },
    handler: async (ctx, args) => {
        const now = Date.now();
        const presenceList = await ctx.db
            .query("presence")
            .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
            .collect();

        for (const presence of presenceList) {
            if (now - presence.lastSeen > PRESENCE_TIMEOUT_MS) {
                await ctx.db.delete(presence._id);
            }
        }
    },
});

export const getVisitorCount = query({
    args: { roomId: v.id("rooms") },
    handler: async (ctx, args) => {
        const now = Date.now();
        const presenceList = await ctx.db
            .query("presence")
            .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
            .collect();

        return presenceList.filter(
            (p) => !p.isOwner && now - p.lastSeen < PRESENCE_TIMEOUT_MS
        ).length;
    },
});
