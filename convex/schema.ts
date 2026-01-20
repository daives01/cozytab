import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
    users: defineTable({
        externalId: v.string(),
        username: v.string(),
        displayName: v.optional(v.string()),
        currency: v.number(),
        cursorColor: v.optional(v.string()),
        keyboardSoundVolume: v.optional(v.number()),
        musicPlayerVolume: v.optional(v.number()),
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
                catalogItemId: v.id("catalogItems"),
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
    })
        .index("by_user", ["userId"])
        .index("by_user_template", ["userId", "templateId"])
        .index("by_user_active", ["userId", "isActive"]),

    catalogItems: defineTable({
        name: v.string(),
        category: v.string(),
        basePrice: v.number(),
        assetUrl: v.string(),
        defaultWidth: v.number(),
        isStarterItem: v.optional(v.boolean()),
    }).index("by_name", ["name"]),

    inventory: defineTable({
        userId: v.id("users"),
        catalogItemId: v.id("catalogItems"),
        purchasedAt: v.number(),
        hidden: v.optional(v.boolean()),
        count: v.optional(v.number()),
    })
        .index("by_user", ["userId"])
        .index("by_user_and_item", ["userId", "catalogItemId"]),

    roomInvites: defineTable({
        roomId: v.id("rooms"),
        code: v.string(), // 6-char invite code used in links
        createdAt: v.number(),
        expiresAt: v.number(),
        // Track host-only idle timeout
        hostOnlySince: v.optional(v.number()),
        createdBy: v.id("users"),
    })
        .index("by_room", ["roomId"])
        .index("by_code", ["code"]),

    currencyTransactions: defineTable({
        userId: v.id("users"),
        delta: v.number(),
        reason: v.string(),
        idempotencyKey: v.string(),
        createdAt: v.number(),
        metadata: v.optional(v.any()),
    })
        .index("by_user", ["userId"])
        .index("by_idempotencyKey", ["idempotencyKey"]),

    chessBoardStates: defineTable({
        itemId: v.string(),
        fen: v.string(),
        lastMove: v.optional(v.object({ from: v.string(), to: v.string() })),
    })
        .index("by_itemId", ["itemId"]),
});
