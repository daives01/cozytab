import { query, mutation } from "./_generated/server";
import type { QueryCtx, MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import { catalogItemCategoryValidator } from "./lib/categories";

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
        category: catalogItemCategoryValidator,
        basePrice: v.number(),
        assetUrl: v.string(),
        defaultWidth: v.number(),
        isStarterItem: v.optional(v.boolean()),
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

        const id = await ctx.db.insert("catalogItems", {
            ...args,
            isStarterItem: args.isStarterItem ?? false,
        });
        return { success: true, id };
    },
});

export const updateItem = mutation({
    args: {
        id: v.id("catalogItems"),
        name: v.optional(v.string()),
        category: v.optional(catalogItemCategoryValidator),
        basePrice: v.optional(v.number()),
        assetUrl: v.optional(v.string()),
        defaultWidth: v.optional(v.number()),
        isStarterItem: v.optional(v.boolean()),
    },
    handler: async (ctx, args) => {
        await requireAdmin(ctx);

        const { id, ...updates } = args;

        const existing = await ctx.db.get(id);
        if (!existing) {
            return { success: false, message: "Item not found" };
        }

        const filteredUpdates = Object.fromEntries(
            Object.entries(updates).filter(([, value]) => value !== undefined)
        ) as Partial<typeof updates>;

        if (Object.keys(filteredUpdates).length === 0) {
            return { success: true };
        }

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
