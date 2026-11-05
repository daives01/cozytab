import { ConvexError } from "convex/values";
import type { MutationCtx, QueryCtx } from "../_generated/server";

export type RequestCtx = QueryCtx | MutationCtx;

export async function requireIdentity(ctx: RequestCtx) {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) throw new ConvexError("Not authenticated");

    return identity;
}

export async function getCurrentUser(ctx: RequestCtx) {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) return null;

    return await ctx.db
        .query("users")
        .withIndex("by_externalId", (query) => query.eq("externalId", identity.subject))
        .unique();
}

export async function requireUser(ctx: RequestCtx) {
    const identity = await requireIdentity(ctx);

    const user = await ctx.db
        .query("users")
        .withIndex("by_externalId", (query) => query.eq("externalId", identity.subject))
        .unique();

    if (!user) throw new ConvexError("User not found");

    return user;
}

export async function requireUserWithIdentity(ctx: RequestCtx) {
    const identity = await requireIdentity(ctx);

    const user = await ctx.db
        .query("users")
        .withIndex("by_externalId", (query) => query.eq("externalId", identity.subject))
        .unique();

    if (!user) throw new ConvexError("User not found");

    return { identity, user };
}

export async function requireAdmin(ctx: RequestCtx) {
    const user = await requireUser(ctx);

    if (!user.admin) throw new ConvexError("Admin access required");

    return user;
}
