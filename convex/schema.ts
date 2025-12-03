import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
    users: defineTable({
        externalId: v.string(),
        username: v.string(),
        displayName: v.optional(v.string()),
        avatarConfig: v.optional(v.any()),
        currency: v.number(),
        lastDailyReward: v.optional(v.number()), // timestamp of last reward
    }).index("by_externalId", ["externalId"]),

    rooms: defineTable({
        userId: v.id("users"),
        name: v.string(),
        backgroundTheme: v.string(),
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
                videoX: v.optional(v.number()),
                videoY: v.optional(v.number()),
                videoWidth: v.optional(v.number()),
                videoHeight: v.optional(v.number()),
                videoVisible: v.optional(v.boolean()),
            })
        ),
        shortcuts: v.optional(
            v.array(
                v.object({
                    id: v.string(),
                    name: v.string(),
                    url: v.string(),
                    icon: v.optional(v.string()),
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
        defaultHeight: v.number(),
    }).index("by_name", ["name"]),

    inventory: defineTable({
        userId: v.id("users"),
        catalogItemId: v.id("catalogItems"),
        purchasedAt: v.number(), // timestamp
    })
        .index("by_user", ["userId"])
        .index("by_user_and_item", ["userId", "catalogItemId"]),
});
