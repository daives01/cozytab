import { v } from "convex/values";
import { mutation } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { GUEST_STARTING_COINS, type GuestShortcut, type RoomItem } from "@shared/guestTypes";
import { MAX_ROOM_ITEMS } from "@shared/roomLimits";
import { applyCurrencyChange } from "./lib/currency";
import { requireIdentity } from "./lib/auth";
import { isValidPrice } from "./lib/price";
import { normalizeRoomItemUrl } from "../shared/roomItemUrl";
import { normalizeShortcutsWithGrid, randomBrightColor } from "./lib/userSettings";

// Inventory and shortcuts have separate conversion bounds from room capacity.
const MAX_GUEST_ITEMS = 100;
const MAX_POSITION = 1_400;
const MAX_TIME_POSITION_MS = 86_400_000;
const MAX_URL_LENGTH = 2_048;

const guestRoomItemValidator = v.object({
    id: v.string(),
    catalogItemId: v.string(),
    x: v.number(),
    y: v.number(),
    url: v.optional(v.string()),
    flipped: v.optional(v.boolean()),
    musicUrl: v.optional(v.string()),
    musicType: v.optional(v.literal("youtube")),
    musicPlaying: v.optional(v.boolean()),
    musicStartedAt: v.optional(v.number()),
    musicPositionAtStart: v.optional(v.number()),
});

type GuestRoomItem = Omit<RoomItem, "catalogItemId"> & { catalogItemId: string };

const guestShortcutValidator = v.object({
    id: v.string(),
    name: v.string(),
    url: v.string(),
    row: v.optional(v.number()),
    col: v.optional(v.number()),
});

const guestProgressValidator = v.object({
    coins: v.number(),
    inventoryIds: v.array(v.string()),
    roomItems: v.array(guestRoomItemValidator),
    shortcuts: v.array(guestShortcutValidator),
    onboardingCompleted: v.boolean(),
    cursorColor: v.string(),
});

function normalizeString(value: unknown) {
    return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function deriveNames(identity: Awaited<ReturnType<typeof requireIdentity>>, fallbackUsername: string) {
    const givenName =
        normalizeString((identity as { firstName?: string }).firstName) ??
        normalizeString((identity as { givenName?: string }).givenName);

    const familyName =
        normalizeString((identity as { lastName?: string }).lastName) ??
        normalizeString((identity as { familyName?: string }).familyName);

    const identityName =
        normalizeString(identity.name) ??
        (givenName && familyName ? `${givenName} ${familyName}` : undefined) ??
        givenName ??
        familyName;

    const tokenTail = identity.tokenIdentifier?.split(":").pop();

    const rawEmail =
        normalizeString((identity as { email?: string }).email) ??
        normalizeString((identity as { emailAddress?: string }).emailAddress) ??
        (tokenTail?.includes("@") ? tokenTail : undefined);

    const emailLocal = rawEmail?.split("@")[0];
    const providedUsername = normalizeString(fallbackUsername);
    const identityUsername = normalizeString(identity.username);

    return {
        username: providedUsername ?? identityUsername ?? emailLocal ?? identityName ?? tokenTail ?? "user",
        displayName: providedUsername ?? identityName ?? identityUsername ?? emailLocal ?? tokenTail ?? "Guest",
    };
}

function generateReferralCode() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";

    for (let index = 0; index < 8; index += 1) {
        code += chars[Math.floor(Math.random() * chars.length)];
    }

    return code;
}

async function generateUniqueReferralCode(ctx: MutationCtx) {
    let code = generateReferralCode();

    while (
        await ctx.db
            .query("users")
            .withIndex("by_referralCode", (query) => query.eq("referralCode", code))
            .unique()
    ) {
        code = generateReferralCode();
    }

    return code;
}

function clamp(value: number, minimum: number, maximum: number) {
    if (!Number.isFinite(value)) return minimum;

    return Math.min(maximum, Math.max(minimum, value));
}

function sanitizeRoomItem(item: GuestRoomItem, catalogItemId: Id<"catalogItems">): RoomItem {
    const sanitized: RoomItem = {
        id: item.id,
        catalogItemId,
        x: clamp(item.x, 0, MAX_POSITION),
        y: clamp(item.y, 0, MAX_POSITION),
    };

    if (item.url !== undefined) {
        const url = normalizeRoomItemUrl(item.url);

        if (url) sanitized.url = url;
    }

    if (item.flipped !== undefined) sanitized.flipped = item.flipped;

    if (item.musicUrl !== undefined) sanitized.musicUrl = item.musicUrl.slice(0, MAX_URL_LENGTH);

    if (item.musicType === "youtube") sanitized.musicType = "youtube";

    if (item.musicPlaying !== undefined) sanitized.musicPlaying = item.musicPlaying;

    if (item.musicStartedAt !== undefined)
        sanitized.musicStartedAt = clamp(item.musicStartedAt, 0, MAX_TIME_POSITION_MS);

    if (item.musicPositionAtStart !== undefined)
        sanitized.musicPositionAtStart = clamp(item.musicPositionAtStart, 0, MAX_TIME_POSITION_MS);

    return sanitized;
}

function reconstructEconomy(catalogItems: Doc<"catalogItems">[], requestedInventory: string[]) {
    const byIdOrName = new Map<string, Doc<"catalogItems">>();

    for (const item of catalogItems) {
        byIdOrName.set(item._id, item);
        byIdOrName.set(item.name, item);
    }

    let balance = GUEST_STARTING_COINS;
    const ownedCounts = new Map<Id<"catalogItems">, number>();
    const freeStarters = new Set<Id<"catalogItems">>();

    for (const idOrName of requestedInventory.slice(0, MAX_GUEST_ITEMS)) {
        const item = byIdOrName.get(idOrName);

        if (!item) continue;
        const isFreeStarter = item.isStarterItem === true && !freeStarters.has(item._id);
        const cost = isFreeStarter ? 0 : item.basePrice;

        if (!isValidPrice(cost)) continue;

        if (cost > balance) continue;
        balance -= cost;
        ownedCounts.set(item._id, (ownedCounts.get(item._id) ?? 0) + 1);

        if (isFreeStarter) freeStarters.add(item._id);
    }

    for (const starter of catalogItems.filter((item) => item.isStarterItem === true)) {
        if (!ownedCounts.has(starter._id)) ownedCounts.set(starter._id, 1);
    }

    return { balance, ownedCounts };
}

function preserveOwnedPlacements(
    roomItems: GuestRoomItem[],
    ownedCounts: Map<Id<"catalogItems">, number>,
    catalogByIdOrName: Map<string, Doc<"catalogItems">>,
) {
    const remaining = new Map(ownedCounts);
    const preserved: RoomItem[] = [];

    for (const item of roomItems.slice(0, MAX_GUEST_ITEMS)) {
        const catalogItem = catalogByIdOrName.get(item.catalogItemId);

        if (!catalogItem) continue;
        const count = remaining.get(catalogItem._id) ?? 0;

        if (count <= 0) continue;
        preserved.push(sanitizeRoomItem(item, catalogItem._id));

        if (preserved.length === MAX_ROOM_ITEMS) break;
        remaining.set(catalogItem._id, count - 1);
    }

    return preserved;
}

function sanitizeShortcuts(shortcuts: GuestShortcut[]) {
    return normalizeShortcutsWithGrid(
        shortcuts.slice(0, MAX_GUEST_ITEMS).map(({ id, name, url, row, col }) => ({
            id,
            name,
            url,
            row,
            col,
        })),
    );
}

export const resolveGuestProgress = mutation({
    args: {
        username: v.string(),
        referralCode: v.optional(v.string()),
        guestProgress: guestProgressValidator,
    },
    handler: async (ctx, args) => {
        const identity = await requireIdentity(ctx);

        const existingUser = await ctx.db
            .query("users")
            .withIndex("by_externalId", (query) => query.eq("externalId", identity.subject))
            .unique();

        if (existingUser) return { disposition: "discarded_existing_user" as const };

        const defaultTemplates = await ctx.db
            .query("roomTemplates")
            .withIndex("by_default", (query) => query.eq("isDefault", true))
            .collect();

        const template = defaultTemplates[0];

        if (!template) throw new Error("Default room template is not configured");

        const catalogItems = await ctx.db.query("catalogItems").collect();
        const { balance, ownedCounts } = reconstructEconomy(catalogItems, args.guestProgress.inventoryIds);
        const catalogByIdOrName = new Map<string, Doc<"catalogItems">>();

        for (const item of catalogItems) {
            catalogByIdOrName.set(item._id, item);
            catalogByIdOrName.set(item.name, item);
        }

        const roomItems = preserveOwnedPlacements(args.guestProgress.roomItems, ownedCounts, catalogByIdOrName);
        const shortcuts = sanitizeShortcuts(args.guestProgress.shortcuts);
        const cursorColor = normalizeString(args.guestProgress.cursorColor) ?? randomBrightColor();
        const names = deriveNames(identity, args.username);

        const providedReferralCode = normalizeString(args.referralCode);

        const referrer = providedReferralCode
            ? await ctx.db
                  .query("users")
                  .withIndex("by_referralCode", (query) => query.eq("referralCode", providedReferralCode))
                  .unique()
            : null;

        const referralCode = await generateUniqueReferralCode(ctx);

        const userId = await ctx.db.insert("users", {
            externalId: identity.subject,
            username: names.username,
            displayName: names.displayName,
            currency: 0,
            cursorColor,
            computer: { shortcuts },
            loginStreak: 0,
            onboardingCompleted: args.guestProgress.onboardingCompleted,
            referralCode,
            referredBy: referrer?._id,
        });

        await applyCurrencyChange({
            ctx,
            userId,
            delta: balance,
            reason: "starting_balance",
            idempotencyKey: `starting:${userId}`,
            metadata: { source: "guest_progress", startingBudget: GUEST_STARTING_COINS },
        });

        for (const [catalogItemId, count] of ownedCounts) {
            await ctx.db.insert("inventory", { userId, catalogItemId, purchasedAt: Date.now(), count });
        }

        await ctx.db.insert("rooms", {
            userId,
            templateId: template._id,
            name: template.name,
            isActive: true,
            items: roomItems,
        });

        if (referrer) {
            await applyCurrencyChange({
                ctx,
                userId: referrer._id,
                delta: 3,
                reason: "referral",
                idempotencyKey: `referral:${referrer._id}:${identity.subject}`,
                metadata: { referredExternalId: identity.subject },
            });

            const [user1, user2] =
                referrer._id < userId ? ([referrer._id, userId] as const) : ([userId, referrer._id] as const);

            await ctx.db.insert("friendships", {
                user1,
                user2,
                status: "pending",
                initiator: userId,
                createdAt: Date.now(),
            });
        }

        return { disposition: "preserved" as const };
    },
});
