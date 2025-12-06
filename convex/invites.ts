import { query, mutation } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import { v } from "convex/values";

const INVITE_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const INVITE_CODE_LENGTH = 6;
const MAX_CODE_ATTEMPTS = 5;

function generateInviteCode() {
    let code = "";
    for (let i = 0; i < INVITE_CODE_LENGTH; i++) {
        const idx = Math.floor(Math.random() * INVITE_CODE_ALPHABET.length);
        code += INVITE_CODE_ALPHABET[idx];
    }
    return code;
}

async function generateUniqueCode(ctx: MutationCtx) {
    let code = generateInviteCode();
    for (let i = 0; i < MAX_CODE_ATTEMPTS; i++) {
        const existing = await ctx.db
            .query("roomInvites")
            .withIndex("by_code", (q) => q.eq("code", code))
            .unique();
        if (!existing) return code;
        code = generateInviteCode();
    }
    return code;
}

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

        const invites = await ctx.db
            .query("roomInvites")
            .withIndex("by_room", (q) => q.eq("roomId", room._id))
            .collect();

        const now = Date.now();
        const sorted = invites.sort((a, b) => b.createdAt - a.createdAt);
        const primary = sorted[0];

        if (primary) {
            // Reactivate newest invite; remove extras.
            await ctx.db.patch(primary._id, { isActive: true, createdAt: now });
            for (const invite of sorted.slice(1)) {
                await ctx.db.delete(invite._id);
            }
            const code = primary.code ?? primary.token;
            return { inviteId: primary._id, token: code, code };
        }

        const code = await generateUniqueCode(ctx);

        const inviteId = await ctx.db.insert("roomInvites", {
            roomId: room._id,
            token: code,
            code,
            createdAt: now,
            isActive: true,
            createdBy: user._id,
        });

        return { inviteId, token: code, code };
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

export const rotateInviteCode = mutation({
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

        // Remove all but the newest invite, then rotate that one.
        const sorted = invites.sort((a, b) => b.createdAt - a.createdAt);
        const primary = sorted[0];
        for (const invite of sorted.slice(1)) {
            await ctx.db.delete(invite._id);
        }

        const code = await generateUniqueCode(ctx);
        const now = Date.now();

        if (primary) {
            await ctx.db.patch(primary._id, {
                code,
                token: code,
                createdAt: now,
                isActive: true,
                createdBy: user._id,
            });
            return { inviteId: primary._id, token: code, code };
        }

        const inviteId = await ctx.db.insert("roomInvites", {
            roomId: room._id,
            token: code,
            code,
            createdAt: now,
            isActive: true,
            createdBy: user._id,
        });

        return { inviteId, token: code, code };
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
        const now = Date.now();
        const invite =
            (await ctx.db
                .query("roomInvites")
                .withIndex("by_code", (q) => q.eq("code", args.token))
                .unique()) ??
            (await ctx.db
                .query("roomInvites")
                .withIndex("by_token", (q) => q.eq("token", args.token))
                .unique());

        if (!invite) return null;
        if (!invite.isActive) return null;
        if (invite.expiresAt && invite.expiresAt < now) return null;

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

        const now = Date.now();
        const active = invites
            .filter((invite) => invite.isActive && (!invite.expiresAt || invite.expiresAt > now))
            .sort((a, b) => b.createdAt - a.createdAt);

        const primary = active[0];

        return primary ? [primary] : [];
    },
});
