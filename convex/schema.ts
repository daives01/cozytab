import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
    users: defineTable({
        externalId: v.string(),
        username: v.string(),
        displayName: v.optional(v.string()),
        avatarConfig: v.optional(v.any()),
        currency: v.number(),
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
            })
        ),
    }).index("by_user", ["userId"]),

    catalogItems: defineTable({
        name: v.string(),
        category: v.string(),
        basePrice: v.number(),
        assetUrl: v.string(),
        defaultWidth: v.number(),
        defaultHeight: v.number(),
    }),
});
