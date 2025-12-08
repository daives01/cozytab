import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
    users: defineTable({
        externalId: v.string(),
        username: v.string(),
        displayName: v.optional(v.string()),
        currency: v.number(),
        cursorColor: v.optional(v.string()),
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
                )
            })
        ),
        lastDailyRewardDay: v.optional(v.string()),
        loginStreak: v.optional(v.number()),
        onboardingCompleted: v.optional(v.boolean()),
        referralCode: v.string(),
        referredBy: v.optional(v.id("users")),
        admin: v.optional(v.boolean()),
    })
        .index("by_externalId", ["externalId"])
        .index("by_referralCode", ["referralCode"])
        .index("by_referredBy", ["referredBy"]),

    roomTemplates: defineTable({
        name: v.string(),
        description: v.optional(v.string()),
        basePrice: v.number(),
        backgroundUrl: v.string(),
        isDefault: v.boolean(),
    }).index("by_default", ["isDefault"]),

    rooms: defineTable({
        userId: v.id("users"),
        templateId: v.id("roomTemplates"),
        name: v.string(),
        isActive: v.boolean(),
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
        .index("by_user_template", ["userId", "templateId"])
        .index("by_user_active", ["userId", "isActive"]),

    roomLeases: defineTable({
        roomId: v.id("rooms"),
        hostId: v.id("users"),
        lastSeen: v.number(),
        expiresAt: v.number(),
        hostOnlySince: v.optional(v.number()),
    })
        .index("by_room", ["roomId"])
        .index("by_host", ["hostId"]),

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
        purchasedAt: v.number(),
        hidden: v.optional(v.boolean()),
    })
        .index("by_user", ["userId"])
        .index("by_user_and_item", ["userId", "catalogItemId"]),

    roomInvites: defineTable({
        roomId: v.id("rooms"),
        token: v.string(),
        code: v.string(),
        createdAt: v.number(),
        expiresAt: v.optional(v.number()),
        isActive: v.boolean(),
        createdBy: v.id("users"),
    })
        .index("by_token", ["token"])
        .index("by_room", ["roomId"])
        .index("by_code", ["code"]),
});
