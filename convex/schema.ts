import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
    users: defineTable({
        externalId: v.string(),
        username: v.string(),
        displayName: v.optional(v.string()),
        currency: v.number(),
        computer: v.optional(
            v.object({
                shortcuts: v.array(
                    v.object({
                        id: v.string(),
                        name: v.string(),
                        url: v.string(),
                        row: v.number(),
                        col: v.number(),
                    })
                ),
            })
        ),
        lastDailyReward: v.optional(v.number()), // timestamp of last reward
        onboardingCompleted: v.optional(v.boolean()), // whether user has completed the tutorial
        referralCode: v.string(), // unique code for sharing
        referredBy: v.optional(v.id("users")), // who referred this user
        admin: v.optional(v.boolean()), // admin access, defaults to false
    })
        .index("by_externalId", ["externalId"])
        .index("by_referralCode", ["referralCode"])
        .index("by_referredBy", ["referredBy"]),

    roomTemplates: defineTable({
        name: v.string(),                    // "Cozy Cabin", "Beach House"
        description: v.optional(v.string()), // Optional description
        basePrice: v.number(),               // 0 for default, currency for others
        backgroundUrl: v.string(),           // Background image (storage:id or URL)
        isDefault: v.boolean(),              // True for the free starter room
    }).index("by_default", ["isDefault"]),

    rooms: defineTable({
        userId: v.id("users"),
        templateId: v.id("roomTemplates"),   // Which template this room uses
        name: v.string(),
        isActive: v.boolean(),               // Which room is currently displayed
        items: v.array(
            v.object({
                id: v.string(),
                catalogItemId: v.string(),
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
        shortcuts: v.optional(
            v.array(
                v.object({
                    id: v.string(),
                    name: v.string(),
                    url: v.string(),
                    row: v.optional(v.number()),
                    col: v.optional(v.number()),
                })
            )
        ),
    })
        .index("by_user", ["userId"])
        .index("by_user_active", ["userId", "isActive"]),

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
        hidden: v.optional(v.boolean()), // allow users to hide items in the drawer
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
});
