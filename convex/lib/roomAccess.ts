import { ConvexError } from "convex/values";
import type { Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

type RequestCtx = QueryCtx | MutationCtx;

export async function getRoomOrThrow(ctx: RequestCtx, roomId: Id<"rooms">) {
    const room = await ctx.db.get(roomId);
    if (!room) throw new ConvexError("Room not found");
    return room;
}

export function assertRoomOwner(room: { userId: Id<"users"> }, user: { _id: Id<"users"> }) {
    if (room.userId !== user._id) throw new ConvexError("Forbidden");
}

export function assertRoomActive(room: { isActive: boolean }) {
    if (!room.isActive) throw new ConvexError("Room is inactive");
}

/** A user has at most one active room. Creation activates only the first room; switching deactivates the previous one. */
export async function getActiveRoomForUser(ctx: RequestCtx, userId: Id<"users">) {
    return await ctx.db
        .query("rooms")
        .withIndex("by_user_active", (query) => query.eq("userId", userId).eq("isActive", true))
        .first();
}
