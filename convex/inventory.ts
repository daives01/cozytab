import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { applyCurrencyChange } from "./lib/currency";
import { randomId } from "./lib/id";

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

        const catalogCache = new Map<string, Doc<"catalogItems">>();

        const detailedInventory = await Promise.all(
            inventoryItems.map(async (inv) => {
                const count = inv.count ?? 1;
                if (count <= 0) return null;
                const cached = catalogCache.get(inv.catalogItemId);
                const catalogItem = cached ?? (await ctx.db.get(inv.catalogItemId));
                if (!catalogItem) return null;
                catalogCache.set(inv.catalogItemId, catalogItem);

                return {
                    inventoryId: inv._id,
                    catalogItemId: inv.catalogItemId,
                    name: catalogItem.name,
                    category: catalogItem.category,
                    basePrice: catalogItem.basePrice,
                    assetUrl: catalogItem.assetUrl,
                    defaultWidth: catalogItem.defaultWidth,
                    hidden: inv.hidden ?? false,
                    purchasedAt: inv.purchasedAt,
                    count,
                };
            })
        );

        return detailedInventory
            .filter((item): item is NonNullable<typeof item> => item !== null)
            .sort((a, b) => b.purchasedAt - a.purchasedAt);
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

        return inventoryItems
            .filter((inv) => (inv.count ?? 1) > 0)
            .map((inv) => inv.catalogItemId);
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

        return inventoryItem !== null && (inventoryItem.count ?? 1) > 0;
    },
});

export const purchaseItem = mutation({
    args: {
        catalogItemId: v.id("catalogItems"),
        requestId: v.optional(v.string()),
    },
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

        const catalogItem = await ctx.db.get(args.catalogItemId);
        if (!catalogItem) {
            return { success: false, message: "Item not found" };
        }

        if (user.currency < catalogItem.basePrice) {
            return { success: false, message: "Insufficient funds" };
        }

        const requestId = args.requestId ?? randomId();
        const change = await applyCurrencyChange({
            ctx,
            userId: user._id,
            delta: -catalogItem.basePrice,
            reason: "purchase",
            idempotencyKey: `purchase:${user._id}:${requestId}`,
            metadata: { catalogItemId: args.catalogItemId },
        });
        if (!change.applied) {
            return { success: true, newBalance: change.balance };
        }

        if (existingItem) {
            await ctx.db.patch(existingItem._id, {
                count: (existingItem.count ?? 1) + 1,
                hidden: existingItem.hidden ?? false,
            });
        } else {
            await ctx.db.insert("inventory", {
                userId: user._id,
                catalogItemId: args.catalogItemId,
                purchasedAt: Date.now(),
                hidden: false,
                count: 1,
            });
        }

        return {
            success: true,
            newBalance: change.balance,
        };
    },
});

export const setHidden = mutation({
    args: { inventoryId: v.id("inventory"), hidden: v.boolean() },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Not authenticated");

        const user = await ctx.db
            .query("users")
            .withIndex("by_externalId", (q) => q.eq("externalId", identity.subject))
            .unique();

        if (!user) throw new Error("User not found");

        const inventoryItem = await ctx.db.get(args.inventoryId);
        if (!inventoryItem || inventoryItem.userId !== user._id) {
            throw new Error("Not authorized to update this item");
        }

        await ctx.db.patch(args.inventoryId, { hidden: args.hidden });

        return { success: true };
    },
});

export const backfillInventoryCounts = mutation({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        const nodeEnv = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.NODE_ENV;
        if (!identity) {
            throw new Error("Not authenticated");
        }
        if (nodeEnv !== "development") {
            throw new Error("Backfill is dev-only");
        }

        const updated: string[] = [];
        const inventoryItems = await ctx.db.query("inventory").collect();
        for (const item of inventoryItems) {
            if (item.count === undefined) {
                await ctx.db.patch(item._id, { count: 1 });
                updated.push(item._id as unknown as string);
            }
        }

        return { updated };
    },
});

