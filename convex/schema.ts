import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
    users: defineTable({
        externalId: v.string(),
        username: v.string(),
        displayName: v.optional(v.string()),
        currency: v.number(),
        lastDailyReward: v.optional(v.number()), // timestamp of last reward
        onboardingCompleted: v.optional(v.boolean()), // whether user has completed the tutorial
        referralCode: v.string(), // unique code for sharing
        referredBy: v.optional(v.id("users")), // who referred this user
        admin: v.optional(v.boolean()), // admin access, defaults to false
    })
        .index("by_externalId", ["externalId"])
        .index("by_referralCode", ["referralCode"]),

    rooms: defineTable({
        userId: v.id("users"),
        name: v.string(),
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
        shortcuts: v.optional(
            v.array(
                v.object({
                    id: v.string(),
                    name: v.string(),
                    url: v.string(),
                })
            )
        ),
    }).index("by_user", ["userId"]),

    catalogItems: defineTable({
        name: v.string(),
        category: v.string(),
        basePrice: v.number(),
        assetUrl: v.string(),
        defaultWidth: v.number(),
    }).index("by_name", ["name"]),

    inventory: defineTable({
        userId: v.id("users"),
        catalogItemId: v.id("catalogItems"),
        purchasedAt: v.number(), // timestamp
    })
        .index("by_user", ["userId"])
        .index("by_user_and_item", ["userId", "catalogItemId"]),

    roomInvites: defineTable({
        roomId: v.id("rooms"),
        token: v.string(),
        createdAt: v.number(),
        expiresAt: v.optional(v.number()),
        isActive: v.boolean(),
        createdBy: v.id("users"),
    })
        .index("by_token", ["token"])
        .index("by_room", ["roomId"]),

    presence: defineTable({
        roomId: v.id("rooms"),
        visitorId: v.string(),
        displayName: v.string(),
        lastSeen: v.number(),
        isOwner: v.boolean(),
        actions: v.array(
            v.object({
                x: v.number(),
                y: v.number(),
                timeSinceBatchStart: v.number(),
                text: v.optional(v.string()),
            })
        ),
    })
        .index("by_room", ["roomId"])
        .index("by_room_and_visitor", ["roomId", "visitorId"]),
});
