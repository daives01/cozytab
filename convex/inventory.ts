import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const getMyInventory = query({
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

        const inventoryItems = await ctx.db
            .query("inventory")
            .withIndex("by_user", (q) => q.eq("userId", user._id))
            .collect();

        const catalogItems = await Promise.all(
            inventoryItems.map(async (inv) => {
                const catalogItem = await ctx.db.get(inv.catalogItemId);
                return catalogItem;
            })
        );

        return catalogItems.filter((item): item is NonNullable<typeof item> => item !== null);
    },
});

export const getMyInventoryIds = query({
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

        const inventoryItems = await ctx.db
            .query("inventory")
            .withIndex("by_user", (q) => q.eq("userId", user._id))
            .collect();

        return inventoryItems.map((inv) => inv.catalogItemId);
    },
});

export const hasItem = query({
    args: { catalogItemId: v.id("catalogItems") },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return false;

        const user = await ctx.db
            .query("users")
            .withIndex("by_externalId", (q) =>
                q.eq("externalId", identity.subject)
            )
            .unique();

        if (!user) return false;

        const inventoryItem = await ctx.db
            .query("inventory")
            .withIndex("by_user_and_item", (q) =>
                q.eq("userId", user._id).eq("catalogItemId", args.catalogItemId)
            )
            .unique();

        return inventoryItem !== null;
    },
});

export const purchaseItem = mutation({
    args: { catalogItemId: v.id("catalogItems") },
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

        const existingItem = await ctx.db
            .query("inventory")
            .withIndex("by_user_and_item", (q) =>
                q.eq("userId", user._id).eq("catalogItemId", args.catalogItemId)
            )
            .unique();

        if (existingItem) {
            return { success: false, message: "You already own this item" };
        }

        const catalogItem = await ctx.db.get(args.catalogItemId);
        if (!catalogItem) {
            return { success: false, message: "Item not found" };
        }

        if (user.currency < catalogItem.basePrice) {
            return { success: false, message: "Insufficient funds" };
        }

        await ctx.db.patch(user._id, {
            currency: user.currency - catalogItem.basePrice,
        });

        await ctx.db.insert("inventory", {
            userId: user._id,
            catalogItemId: args.catalogItemId,
            purchasedAt: Date.now(),
        });

        return {
            success: true,
            newBalance: user.currency - catalogItem.basePrice,
        };
    },
});

