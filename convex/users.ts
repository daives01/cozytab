import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const getMe = query({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return null;

        const user = await ctx.db
            .query("users")
            .withIndex("by_externalId", (q) =>
                q.eq("externalId", identity.subject)
            )
            .unique();
        return user;
    },
});

export const ensureUser = mutation({
    args: { username: v.string() },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Not authenticated");

        let user = await ctx.db
            .query("users")
            .withIndex("by_externalId", (q) =>
                q.eq("externalId", identity.subject)
            )
            .unique();

        if (!user) {
            const id = await ctx.db.insert("users", {
                externalId: identity.subject,
                username: args.username,
                displayName: identity.name ?? args.username,
                avatarConfig: {},
                currency: 0,
            });
            user = await ctx.db.get(id);
        }

        return user;
    },
});
