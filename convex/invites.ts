import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const createInvite = mutation({
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

        // Get active room
        const rooms = await ctx.db
            .query("rooms")
            .withIndex("by_user_active", (q) => 
                q.eq("userId", user._id).eq("isActive", true)
            )
            .collect();
        const room = rooms[0];
        if (!room) throw new Error("Room not found");

        const existingInvites = await ctx.db
            .query("roomInvites")
            .withIndex("by_room", (q) => q.eq("roomId", room._id))
            .collect();

        for (const invite of existingInvites) {
            if (invite.isActive) {
                await ctx.db.patch(invite._id, { isActive: false });
            }
        }

        const token = crypto.randomUUID();
        const inviteId = await ctx.db.insert("roomInvites", {
            roomId: room._id,
            token,
            createdAt: Date.now(),
            isActive: true,
            createdBy: user._id,
        });

        return { inviteId, token };
    },
});

export const revokeInvite = mutation({
    args: { inviteId: v.id("roomInvites") },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Not authenticated");

        const user = await ctx.db
            .query("users")
            .withIndex("by_externalId", (q) =>
                q.eq("externalId", identity.subject)
            )
            .unique();
        if (!user) throw new Error("User not found");

        const invite = await ctx.db.get(args.inviteId);
        if (!invite) throw new Error("Invite not found");

        if (invite.createdBy !== user._id) {
            throw new Error("Forbidden");
        }

        await ctx.db.patch(args.inviteId, { isActive: false });
        return { success: true };
    },
});

export const revokeAllInvites = mutation({
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

        // Get active room
        const rooms = await ctx.db
            .query("rooms")
            .withIndex("by_user_active", (q) => 
                q.eq("userId", user._id).eq("isActive", true)
            )
            .collect();
        const room = rooms[0];
        if (!room) throw new Error("Room not found");

        const invites = await ctx.db
            .query("roomInvites")
            .withIndex("by_room", (q) => q.eq("roomId", room._id))
            .collect();

        for (const invite of invites) {
            if (invite.isActive) {
                await ctx.db.patch(invite._id, { isActive: false });
            }
        }

        return { success: true, count: invites.filter((i) => i.isActive).length };
    },
});

export const getInviteByToken = query({
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
            invite,
            room,
            ownerName: owner?.displayName ?? owner?.username ?? "Unknown",
        };
    },
});

export const getMyActiveInvites = query({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return [];

        const user = await ctx.db
            .query("users")
            .withIndex("by_externalId", (q) =>
                q.eq("externalId", identity.subject)
            )
            .unique();
        if (!user) return [];

        // Get active room
        const rooms = await ctx.db
            .query("rooms")
            .withIndex("by_user_active", (q) => 
                q.eq("userId", user._id).eq("isActive", true)
            )
            .collect();
        const room = rooms[0];
        if (!room) return [];

        const invites = await ctx.db
            .query("roomInvites")
            .withIndex("by_room", (q) => q.eq("roomId", room._id))
            .collect();

        return invites.filter(
            (invite) =>
                invite.isActive &&
                (!invite.expiresAt || invite.expiresAt > Date.now())
        );
    },
});
