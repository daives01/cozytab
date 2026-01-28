import { mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { v } from "convex/values";

// ── Helpers ──

async function requireUser(ctx: QueryCtx | MutationCtx) {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
        .query("users")
        .withIndex("by_externalId", (q) => q.eq("externalId", identity.subject))
        .unique();
    if (!user) throw new Error("User not found");

    return user;
}

/** Sort two user IDs so user1 < user2 (lexicographic). */
function sortedPair(a: Id<"users">, b: Id<"users">): [Id<"users">, Id<"users">] {
    return a < b ? [a, b] : [b, a];
}

type FriendRequestResult = {
    success: true;
    autoAccepted?: boolean;
    alreadyFriends?: boolean;
    alreadyPending?: boolean;
};

/** Shared logic for creating or updating a friendship between two users. */
async function createOrUpdateFriendship(
    ctx: MutationCtx,
    meId: Id<"users">,
    targetId: Id<"users">
): Promise<FriendRequestResult> {
    const existing = await findFriendship(ctx, meId, targetId);
    if (existing) {
        if (existing.status === "accepted") {
            return { success: true, alreadyFriends: true };
        }
        // If the other person already sent us a request, auto-accept
        if (existing.initiator !== meId) {
            await ctx.db.patch(existing._id, {
                status: "accepted",
                acceptedAt: Date.now(),
            });
            return { success: true, autoAccepted: true };
        }
        return { success: true, alreadyPending: true };
    }

    const [user1, user2] = sortedPair(meId, targetId);
    await ctx.db.insert("friendships", {
        user1,
        user2,
        status: "pending",
        initiator: meId,
        createdAt: Date.now(),
    });

    return { success: true };
}

async function findFriendship(ctx: QueryCtx | MutationCtx, a: Id<"users">, b: Id<"users">) {
    const [user1, user2] = sortedPair(a, b);
    return await ctx.db
        .query("friendships")
        .withIndex("by_pair", (q) => q.eq("user1", user1).eq("user2", user2))
        .unique();
}

async function getAllFriendships(ctx: QueryCtx, userId: Id<"users">) {
    const asUser1 = await ctx.db
        .query("friendships")
        .withIndex("by_user1", (q) => q.eq("user1", userId))
        .collect();
    const asUser2 = await ctx.db
        .query("friendships")
        .withIndex("by_user2", (q) => q.eq("user2", userId))
        .collect();
    return [...asUser1, ...asUser2];
}

// ── Mutations ──

export const sendFriendRequest = mutation({
    args: { friendCode: v.string() },
    handler: async (ctx, args) => {
        const me = await requireUser(ctx);
        const code = args.friendCode.trim().toUpperCase();

        const target = await ctx.db
            .query("users")
            .withIndex("by_referralCode", (q) => q.eq("referralCode", code))
            .unique();

        if (!target) throw new Error("No user found with that code");
        if (target._id === me._id) throw new Error("You can't add yourself");

        return createOrUpdateFriendship(ctx, me._id, target._id);
    },
});

export const sendFriendRequestByUserId = mutation({
    args: { userId: v.id("users") },
    handler: async (ctx, args) => {
        const me = await requireUser(ctx);
        if (args.userId === me._id) throw new Error("You can't add yourself");

        const target = await ctx.db.get(args.userId);
        if (!target) throw new Error("User not found");

        return createOrUpdateFriendship(ctx, me._id, args.userId);
    },
});

export const acceptFriendRequest = mutation({
    args: { friendshipId: v.id("friendships") },
    handler: async (ctx, args) => {
        const me = await requireUser(ctx);
        const friendship = await ctx.db.get(args.friendshipId);
        if (!friendship) throw new Error("Request not found");
        if (friendship.status !== "pending") throw new Error("Request is not pending");
        if (friendship.initiator === me._id) throw new Error("Cannot accept your own request");

        // Verify the current user is the recipient
        const isRecipient = friendship.user1 === me._id || friendship.user2 === me._id;
        if (!isRecipient) throw new Error("Not your request");

        await ctx.db.patch(args.friendshipId, {
            status: "accepted",
            acceptedAt: Date.now(),
        });

        return { success: true };
    },
});

export const declineFriendRequest = mutation({
    args: { friendshipId: v.id("friendships") },
    handler: async (ctx, args) => {
        const me = await requireUser(ctx);
        const friendship = await ctx.db.get(args.friendshipId);
        if (!friendship) throw new Error("Request not found");
        if (friendship.status !== "pending") throw new Error("Request is not pending");

        const isRecipient =
            (friendship.user1 === me._id || friendship.user2 === me._id) &&
            friendship.initiator !== me._id;
        if (!isRecipient) throw new Error("Not your request to decline");

        await ctx.db.delete(args.friendshipId);
        return { success: true };
    },
});

export const cancelFriendRequest = mutation({
    args: { friendshipId: v.id("friendships") },
    handler: async (ctx, args) => {
        const me = await requireUser(ctx);
        const friendship = await ctx.db.get(args.friendshipId);
        if (!friendship) throw new Error("Request not found");
        if (friendship.status !== "pending") throw new Error("Request is not pending");
        if (friendship.initiator !== me._id) throw new Error("Not your request to cancel");

        await ctx.db.delete(args.friendshipId);
        return { success: true };
    },
});

export const removeFriend = mutation({
    args: { friendshipId: v.id("friendships") },
    handler: async (ctx, args) => {
        const me = await requireUser(ctx);
        const friendship = await ctx.db.get(args.friendshipId);
        if (!friendship) throw new Error("Friendship not found");

        const isParticipant = friendship.user1 === me._id || friendship.user2 === me._id;
        if (!isParticipant) throw new Error("Not your friendship");

        await ctx.db.delete(args.friendshipId);
        return { success: true };
    },
});

// ── Queries ──

export const getMyFriends = query({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return [];

        const me = await ctx.db
            .query("users")
            .withIndex("by_externalId", (q) => q.eq("externalId", identity.subject))
            .unique();
        if (!me) return [];

        const all = await getAllFriendships(ctx, me._id);
        const accepted = all.filter((f) => f.status === "accepted");

        const friends = await Promise.all(
            accepted.map(async (f) => {
                const friendId = f.user1 === me._id ? f.user2 : f.user1;
                const friendUser = await ctx.db.get(friendId);
                if (!friendUser) return null;

                // Find friend's active room
                const activeRooms = await ctx.db
                    .query("rooms")
                    .withIndex("by_user_active", (q) =>
                        q.eq("userId", friendId).eq("isActive", true)
                    )
                    .collect();
                const activeRoom = activeRooms[0] ?? null;

                return {
                    friendshipId: f._id,
                    userId: friendId,
                    displayName: friendUser.displayName ?? friendUser.username,
                    username: friendUser.username,
                    cursorColor: friendUser.cursorColor,
                    activeRoomId: activeRoom?._id ?? null,
                    lastSeenAt: friendUser.lastSeenAt ?? null,
                };
            })
        );

        return friends.filter(Boolean);
    },
});

export const getMyPendingRequests = query({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return { incoming: [], outgoing: [] };

        const me = await ctx.db
            .query("users")
            .withIndex("by_externalId", (q) => q.eq("externalId", identity.subject))
            .unique();
        if (!me) return { incoming: [], outgoing: [] };

        const all = await getAllFriendships(ctx, me._id);
        const pending = all.filter((f) => f.status === "pending");

        const incoming = [];
        const outgoing = [];

        for (const f of pending) {
            const otherId = f.user1 === me._id ? f.user2 : f.user1;
            const otherUser = await ctx.db.get(otherId);
            const entry = {
                friendshipId: f._id,
                userId: otherId,
                displayName: otherUser?.displayName ?? otherUser?.username ?? "Unknown",
                cursorColor: otherUser?.cursorColor,
                createdAt: f.createdAt,
            };

            if (f.initiator === me._id) {
                outgoing.push(entry);
            } else {
                incoming.push(entry);
            }
        }

        return { incoming, outgoing };
    },
});

export const getPendingRequestCount = query({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return 0;

        const me = await ctx.db
            .query("users")
            .withIndex("by_externalId", (q) => q.eq("externalId", identity.subject))
            .unique();
        if (!me) return 0;

        // Use status indexes to fetch only pending friendships
        const pendingAsUser1 = await ctx.db
            .query("friendships")
            .withIndex("by_user1_status", (q) => q.eq("user1", me._id).eq("status", "pending"))
            .collect();
        const pendingAsUser2 = await ctx.db
            .query("friendships")
            .withIndex("by_user2_status", (q) => q.eq("user2", me._id).eq("status", "pending"))
            .collect();

        // Only count incoming requests (where someone else is the initiator)
        return [...pendingAsUser1, ...pendingAsUser2].filter((f) => f.initiator !== me._id).length;
    },
});

export const getFriendshipWith = query({
    args: { userId: v.id("users") },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return null;

        const me = await ctx.db
            .query("users")
            .withIndex("by_externalId", (q) => q.eq("externalId", identity.subject))
            .unique();
        if (!me) return null;

        const friendship = await findFriendship(ctx, me._id, args.userId);
        if (!friendship) return null;

        return {
            friendshipId: friendship._id,
            status: friendship.status,
            initiator: friendship.initiator,
            isInitiator: friendship.initiator === me._id,
        };
    },
});

export const getFriendRoom = query({
    args: { friendUserId: v.string() },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return null;

        // Validate the ID format before using it
        const friendUserId = ctx.db.normalizeId("users", args.friendUserId);
        if (!friendUserId) return null;

        const me = await ctx.db
            .query("users")
            .withIndex("by_externalId", (q) => q.eq("externalId", identity.subject))
            .unique();
        if (!me) return null;

        // Validate friendship
        const friendship = await findFriendship(ctx, me._id, friendUserId);
        if (!friendship || friendship.status !== "accepted") return null;

        const friend = await ctx.db.get(friendUserId);
        if (!friend) return null;

        // Find friend's active room
        const activeRooms = await ctx.db
            .query("rooms")
            .withIndex("by_user_active", (q) =>
                q.eq("userId", friendUserId).eq("isActive", true)
            )
            .collect();
        const room = activeRooms[0];
        if (!room) return null;

        const template = await ctx.db.get(room.templateId);

        return {
            room: { ...room, template },
            ownerName: friend.displayName ?? friend.username ?? "Unknown",
            ownerReferralCode: friend.referralCode ?? null,
        };
    },
});

export const getUserByExternalId = query({
    args: { externalId: v.string() },
    handler: async (ctx, args) => {
        const user = await ctx.db
            .query("users")
            .withIndex("by_externalId", (q) => q.eq("externalId", args.externalId))
            .unique();
        if (!user) return null;
        return { _id: user._id, displayName: user.displayName, username: user.username };
    },
});
