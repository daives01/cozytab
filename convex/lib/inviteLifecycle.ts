import type { Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

type RequestCtx = QueryCtx | MutationCtx;

export const INVITE_TTL_MS = 7 * 60 * 1000;
export const HOST_ONLY_TIMEOUT_MS = 10 * 60 * 1000;

export async function getPrimaryInviteForRoom(ctx: RequestCtx, roomId: Id<"rooms">) {
    const invites = await ctx.db
        .query("roomInvites")
        .withIndex("by_room", (query) => query.eq("roomId", roomId))
        .collect();
    return invites.sort((left, right) => right.createdAt - left.createdAt)[0] ?? null;
}

/** expiresAt is the source of truth for whether invite access is open. */
export function isInviteOpen(invite: { expiresAt?: number | null }, now = Date.now()) {
    return invite.expiresAt !== undefined && invite.expiresAt !== null && invite.expiresAt > now;
}

export async function closePrimaryInvite(ctx: MutationCtx, roomId: Id<"rooms">, now = Date.now()) {
    const invite = await getPrimaryInviteForRoom(ctx, roomId);
    if (invite) await ctx.db.patch(invite._id, { expiresAt: now, hostOnlySince: undefined });
    return { invite, expiresAt: now };
}

export function computeHostOnlySince(hasGuests: boolean, existing: number | undefined, now: number) {
    return hasGuests ? undefined : (existing ?? now);
}

export function hasHostOnlyExpired(hostOnlySince: number | undefined, now: number) {
    return hostOnlySince !== undefined && now - hostOnlySince >= HOST_ONLY_TIMEOUT_MS;
}
