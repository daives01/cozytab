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

// Helper to get current user
async function getUser(ctx: QueryCtx | MutationCtx) {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    return await ctx.db
        .query("users")
        .withIndex("by_externalId", (q) => q.eq("externalId", identity.subject))
        .unique();
}

// List all room templates (for shop)
export const list = query({
    args: {},
    handler: async (ctx) => {
        return await ctx.db.query("roomTemplates").collect();
    },
});

// Get the default room template
export const getDefault = query({
    args: {},
    handler: async (ctx) => {
        const templates = await ctx.db
            .query("roomTemplates")
            .withIndex("by_default", (q) => q.eq("isDefault", true))
            .collect();
        return templates[0] ?? null;
    },
});

// Get a template by ID
export const getById = query({
    args: { id: v.id("roomTemplates") },
    handler: async (ctx, args) => {
        return await ctx.db.get(args.id);
    },
});

// List template IDs the user owns rooms for
export const listOwnedTemplateIds = query({
    args: {},
    handler: async (ctx) => {
        const user = await getUser(ctx);
        if (!user) return [];

        const rooms = await ctx.db
            .query("rooms")
            .withIndex("by_user", (q) => q.eq("userId", user._id))
            .collect();

        return rooms.map((room) => room.templateId);
    },
});

// Admin: Add a new room template
export const addTemplate = mutation({
    args: {
        name: v.string(),
        description: v.optional(v.string()),
        basePrice: v.number(),
        backgroundUrl: v.string(),
        isDefault: v.boolean(),
    },
    handler: async (ctx, args) => {
        await requireAdmin(ctx);

        // If setting as default, unset any existing default
        if (args.isDefault) {
            const existingDefaults = await ctx.db
                .query("roomTemplates")
                .withIndex("by_default", (q) => q.eq("isDefault", true))
                .collect();

            for (const template of existingDefaults) {
                await ctx.db.patch(template._id, { isDefault: false });
            }
        }

        const id = await ctx.db.insert("roomTemplates", args);
        return { success: true, id };
    },
});

// Admin: Update an existing room template
export const updateTemplate = mutation({
    args: {
        id: v.id("roomTemplates"),
        name: v.optional(v.string()),
        description: v.optional(v.string()),
        basePrice: v.optional(v.number()),
        backgroundUrl: v.optional(v.string()),
        isDefault: v.optional(v.boolean()),
    },
    handler: async (ctx, args) => {
        await requireAdmin(ctx);

        const { id, ...updates } = args;

        const existing = await ctx.db.get(id);
        if (!existing) {
            return { success: false, message: "Template not found" };
        }

        // If setting as default, unset any existing default
        if (updates.isDefault === true) {
            const existingDefaults = await ctx.db
                .query("roomTemplates")
                .withIndex("by_default", (q) => q.eq("isDefault", true))
                .collect();

            for (const template of existingDefaults) {
                if (template._id !== id) {
                    await ctx.db.patch(template._id, { isDefault: false });
                }
            }
        }

        const filteredUpdates: {
            name?: string;
            description?: string;
            basePrice?: number;
            backgroundUrl?: string;
            isDefault?: boolean;
        } = {};

        if (updates.name !== undefined) filteredUpdates.name = updates.name;
        if (updates.description !== undefined) filteredUpdates.description = updates.description;
        if (updates.basePrice !== undefined) filteredUpdates.basePrice = updates.basePrice;
        if (updates.backgroundUrl !== undefined) filteredUpdates.backgroundUrl = updates.backgroundUrl;
        if (updates.isDefault !== undefined) filteredUpdates.isDefault = updates.isDefault;

        await ctx.db.patch(id, filteredUpdates);
        return { success: true };
    },
});

// Admin: Generate upload URL for background images
export const generateUploadUrl = mutation({
    args: {},
    handler: async (ctx) => {
        await requireAdmin(ctx);
        return await ctx.storage.generateUploadUrl();
    },
});

// Purchase a room with a specific template (creates a new room instance)
export const purchaseRoom = mutation({
    args: { templateId: v.id("roomTemplates") },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Not authenticated");

        const user = await ctx.db
            .query("users")
            .withIndex("by_externalId", (q) => q.eq("externalId", identity.subject))
            .unique();

        if (!user) throw new Error("User not found");

        const template = await ctx.db.get(args.templateId);
        if (!template) {
            return { success: false, message: "Template not found" };
        }

        // Check if user can afford
        if (user.currency < template.basePrice) {
            return { success: false, message: "Insufficient funds" };
        }

        // Deduct currency
        await ctx.db.patch(user._id, {
            currency: user.currency - template.basePrice,
        });

        // Set all existing rooms to inactive
        const existingRooms = await ctx.db
            .query("rooms")
            .withIndex("by_user", (q) => q.eq("userId", user._id))
            .collect();

        for (const room of existingRooms) {
            if (room.isActive) {
                await ctx.db.patch(room._id, { isActive: false });
            }
        }

        // Create new room with this template, set as active
        const roomId = await ctx.db.insert("rooms", {
            userId: user._id,
            templateId: args.templateId,
            name: template.name,
            isActive: true,
            items: [],
            shortcuts: [],
        });

        return {
            success: true,
            roomId,
            newBalance: user.currency - template.basePrice,
        };
    },
});

// Seed default room template
export const seedDefault = mutation({
    args: {},
    handler: async (ctx) => {
        // Check if default already exists
        const existingDefaults = await ctx.db
            .query("roomTemplates")
            .withIndex("by_default", (q) => q.eq("isDefault", true))
            .collect();

        if (existingDefaults.length > 0) {
            return { success: true, message: "Default template already exists", id: existingDefaults[0]._id };
        }

        // Create the default template
        const id = await ctx.db.insert("roomTemplates", {
            name: "Cozy Room",
            description: "Your cozy starter room",
            basePrice: 0,
            backgroundUrl: "/assets/house.png", // Uses the existing house.png
            isDefault: true,
        });

        return { success: true, message: "Default template created", id };
    },
});

