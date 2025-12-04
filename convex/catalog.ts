import { query, mutation } from "./_generated/server";
import type { QueryCtx, MutationCtx } from "./_generated/server";
import { v } from "convex/values";

// Helper to check if the current user is an admin
async function requireAdmin(ctx: QueryCtx | MutationCtx) {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
        throw new Error("Not authenticated");
    }

    const user = await ctx.db
        .query("users")
        .withIndex("by_externalId", (q) => q.eq("externalId", identity.subject))
        .unique();

    if (!user || user.admin !== true) {
        throw new Error("Admin access required");
    }

    return user;
}

export const list = query({
    args: {},
    handler: async (ctx) => {
        return await ctx.db.query("catalogItems").collect();
    },
});

export const getByName = query({
    args: { name: v.string() },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("catalogItems")
            .withIndex("by_name", (q) => q.eq("name", args.name))
            .unique();
    },
});

export const addItem = mutation({
    args: {
        name: v.string(),
        category: v.string(),
        basePrice: v.number(),
        assetUrl: v.string(),
        defaultWidth: v.number(),
        defaultHeight: v.number(),
    },
    handler: async (ctx, args) => {
        await requireAdmin(ctx);

        const existing = await ctx.db
            .query("catalogItems")
            .withIndex("by_name", (q) => q.eq("name", args.name))
            .unique();

        if (existing) {
            return { success: false, message: "Item with this name already exists" };
        }

        const id = await ctx.db.insert("catalogItems", args);
        return { success: true, id };
    },
});

export const updateItem = mutation({
    args: {
        id: v.id("catalogItems"),
        name: v.optional(v.string()),
        category: v.optional(v.string()),
        basePrice: v.optional(v.number()),
        assetUrl: v.optional(v.string()),
        defaultWidth: v.optional(v.number()),
        defaultHeight: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        await requireAdmin(ctx);

        const { id, ...updates } = args;
        
        const existing = await ctx.db.get(id);
        if (!existing) {
            return { success: false, message: "Item not found" };
        }

        const filteredUpdates: {
            name?: string;
            category?: string;
            basePrice?: number;
            assetUrl?: string;
            defaultWidth?: number;
            defaultHeight?: number;
        } = {};
        
        if (updates.name !== undefined) filteredUpdates.name = updates.name;
        if (updates.category !== undefined) filteredUpdates.category = updates.category;
        if (updates.basePrice !== undefined) filteredUpdates.basePrice = updates.basePrice;
        if (updates.assetUrl !== undefined) filteredUpdates.assetUrl = updates.assetUrl;
        if (updates.defaultWidth !== undefined) filteredUpdates.defaultWidth = updates.defaultWidth;
        if (updates.defaultHeight !== undefined) filteredUpdates.defaultHeight = updates.defaultHeight;

        await ctx.db.patch(id, filteredUpdates);
        return { success: true };
    },
});

// Generate a signed upload URL for Convex file storage (admin only)
export const generateUploadUrl = mutation({
    args: {},
    handler: async (ctx) => {
        await requireAdmin(ctx);
        return await ctx.storage.generateUploadUrl();
    },
});

// Get a public URL for a storage ID
export const getImageUrl = query({
    args: { storageId: v.id("_storage") },
    handler: async (ctx, args) => {
        return await ctx.storage.getUrl(args.storageId);
    },
});

export const seed = mutation({
    args: {},
    handler: async (ctx) => {
        const items = [
            {
                name: "TV",
                category: "furniture",
                basePrice: 5,
                assetUrl: "https://placehold.co/100x100/333/fff?text=TV",
                defaultWidth: 100,
                defaultHeight: 100,
            },
            {
                name: "Plant",
                category: "decor",
                basePrice: 3,
                assetUrl: "https://placehold.co/60x100/2ecc71/fff?text=Plant",
                defaultWidth: 60,
                defaultHeight: 100,
            },
            {
                name: "Desk",
                category: "furniture",
                basePrice: 8,
                assetUrl: "https://placehold.co/150x80/e67e22/fff?text=Desk",
                defaultWidth: 150,
                defaultHeight: 80,
            },
            {
                name: "Computer",
                category: "computer",
                basePrice: 10,
                assetUrl: "https://placehold.co/120x100/2563eb/fff?text=Computer",
                defaultWidth: 120,
                defaultHeight: 100,
            },
            {
                name: "Vinyl Player",
                category: "player",
                basePrice: 12,
                assetUrl: "https://placehold.co/100x100/8b5cf6/fff?text=Vinyl+Player",
                defaultWidth: 100,
                defaultHeight: 100,
            },
            {
                name: "Lamp",
                category: "decor",
                basePrice: 4,
                assetUrl: "https://placehold.co/50x80/f1c40f/fff?text=Lamp",
                defaultWidth: 50,
                defaultHeight: 80,
            },
            {
                name: "Bookshelf",
                category: "furniture",
                basePrice: 10,
                assetUrl: "https://placehold.co/120x150/8b4513/fff?text=Bookshelf",
                defaultWidth: 120,
                defaultHeight: 150,
            },
            {
                name: "Rug",
                category: "decor",
                basePrice: 6,
                assetUrl: "https://placehold.co/150x100/e74c3c/fff?text=Rug",
                defaultWidth: 150,
                defaultHeight: 100,
            },
            {
                name: "Picture Frame",
                category: "decor",
                basePrice: 3,
                assetUrl: "https://placehold.co/60x80/9b59b6/fff?text=Frame",
                defaultWidth: 60,
                defaultHeight: 80,
            },
            {
                name: "Chair",
                category: "furniture",
                basePrice: 7,
                assetUrl: "https://placehold.co/80x100/3498db/fff?text=Chair",
                defaultWidth: 80,
                defaultHeight: 100,
            },
        ];

        let inserted = 0;
        let updated = 0;

        for (const item of items) {
            const existing = await ctx.db
                .query("catalogItems")
                .withIndex("by_name", (q) => q.eq("name", item.name))
                .unique();

            if (existing) {
                await ctx.db.patch(existing._id, {
                    category: item.category,
                    basePrice: item.basePrice,
                    assetUrl: item.assetUrl,
                    defaultWidth: item.defaultWidth,
                    defaultHeight: item.defaultHeight,
                });
                updated++;
            } else {
                await ctx.db.insert("catalogItems", item);
                inserted++;
            }
        }

        return `Catalog updated: ${inserted} new items, ${updated} updated`;
    },
});
