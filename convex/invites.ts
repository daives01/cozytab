import { query, mutation } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import { getCurrentUser, requireUser } from "./lib/auth";
import { getActiveRoomForUser } from "./lib/roomAccess";
import { INVITE_TTL_MS, isInviteOpen } from "./lib/inviteLifecycle";

const INVITE_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const INVITE_CODE_LENGTH = 6;
const MAX_CODE_ATTEMPTS = 5;

const inviteResultValidator = v.object({
    inviteId: v.id("roomInvites"),
    token: v.string(),
    code: v.string(),
});

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

export const enableInvite = mutation({
    args: {},
    returns: inviteResultValidator,
    handler: async (ctx) => {
        const user = await requireUser(ctx);

        // Get active room
        const room = await getActiveRoomForUser(ctx, user._id);

        if (!room) throw new ConvexError("Room not found");

        const invites = await ctx.db
            .query("roomInvites")
            .withIndex("by_room", (q) => q.eq("roomId", room._id))
            .collect();

        const now = Date.now();
        const sorted = invites.sort((a, b) => b.createdAt - a.createdAt);
        const primary = sorted[0];

        if (primary) {
            // Reactivate newest invite; remove extras.
            await ctx.db.patch(primary._id, {
                createdAt: now,
                expiresAt: now + INVITE_TTL_MS,
                hostOnlySince: undefined,
            });

            for (const invite of sorted.slice(1)) {
                await ctx.db.delete(invite._id);
            }

            const code = primary.code;

            return { inviteId: primary._id, token: code, code };
        }

        const code = await generateUniqueCode(ctx);

        const inviteId = await ctx.db.insert("roomInvites", {
            roomId: room._id,
            code,
            createdAt: now,
            expiresAt: now + INVITE_TTL_MS,
            hostOnlySince: undefined,
            createdBy: user._id,
        });

        return { inviteId, token: code, code };
    },
});

export const revokeInvite = mutation({
    args: { inviteId: v.id("roomInvites") },
    returns: v.object({ success: v.literal(true) }),
    handler: async (ctx, args) => {
        const user = await requireUser(ctx);

        const invite = await ctx.db.get(args.inviteId);

        if (!invite) throw new ConvexError("Invite not found");

        if (invite.createdBy !== user._id) {
            throw new ConvexError("Forbidden");
        }

        await ctx.db.patch(args.inviteId, {
            expiresAt: Date.now(),
            hostOnlySince: undefined,
        });

        return { success: true as const };
    },
});

export const rotateInviteCode = mutation({
    args: {},
    returns: inviteResultValidator,
    handler: async (ctx) => {
        const user = await requireUser(ctx);

        const room = await getActiveRoomForUser(ctx, user._id);

        if (!room) throw new ConvexError("Room not found");

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
                createdAt: now,
                expiresAt: now + INVITE_TTL_MS,
                hostOnlySince: undefined,
                createdBy: user._id,
            });

            return { inviteId: primary._id, token: code, code };
        }

        const inviteId = await ctx.db.insert("roomInvites", {
            roomId: room._id,
            code,
            createdAt: now,
            expiresAt: now + INVITE_TTL_MS,
            hostOnlySince: undefined,
            createdBy: user._id,
        });

        return { inviteId, token: code, code };
    },
});

/** Open-only invite details for legacy callers. Use rooms.getRoomByInvite when closed-state visibility is required. */
export const getInviteByToken = query({
    args: { token: v.string() },
    handler: async (ctx, args) => {
        const now = Date.now();

        const invite = await ctx.db
            .query("roomInvites")
            .withIndex("by_code", (q) => q.eq("code", args.token))
            .unique();

        if (!invite) return null;

        if (!isInviteOpen(invite, now)) return null;

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
        const user = await getCurrentUser(ctx);

        if (!user) return [];

        // Get active room
        const room = await getActiveRoomForUser(ctx, user._id);

        if (!room) return [];

        const invites = await ctx.db
            .query("roomInvites")
            .withIndex("by_room", (q) => q.eq("roomId", room._id))
            .collect();

        const now = Date.now();
        const active = invites.filter((invite) => invite.expiresAt > now).sort((a, b) => b.createdAt - a.createdAt);

        const primary = active[0];

        return primary ? [primary] : [];
    },
});
