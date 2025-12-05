import { query, mutation } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import type { Id, Doc } from "./_generated/dataModel";
import {
    GUEST_STARTING_COINS,
    type GuestRoomItem,
    type GuestSessionState,
    type GuestShortcut,
} from "../shared/guestTypes";

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

export const isAdmin = query({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return false;

        const user = await ctx.db
            .query("users")
            .withIndex("by_externalId", (q) =>
                q.eq("externalId", identity.subject)
            )
            .unique();

        return user?.admin === true;
    },
});

export const getMyReferralCode = query({
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

        return user?.referralCode ?? null;
    },
});

export const getReferralStats = query({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            return { referralCount: 0, referralCoins: 0 };
        }

        const user = await ctx.db
            .query("users")
            .withIndex("by_externalId", (q) =>
                q.eq("externalId", identity.subject)
            )
            .unique();

        if (!user) {
            return { referralCount: 0, referralCoins: 0 };
        }

        const referredUsers = await ctx.db
            .query("users")
            .withIndex("by_referredBy", (q) =>
                q.eq("referredBy", user._id)
            )
            .collect();

        const referralCount = referredUsers.length;

        return {
            referralCount,
            referralCoins: referralCount, // one coin per referral
        };
    },
});

// Generate a short, readable referral code
function generateReferralCode(): string {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Exclude confusing chars like 0/O, 1/I
    let code = "";
    for (let i = 0; i < 8; i++) {
        code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
}

const MAX_GUEST_ITEMS = 100;

async function importInventoryWithinBudget(
    ctx: MutationCtx,
    userId: Id<"users">,
    guestInventory: string[],
    startingCurrency: number
) {
    const inventoryNames = new Set<string>();
    const catalogCostCache: Record<string, number> = {};
    const catalogItems: Doc<"catalogItems">[] = await ctx.db.query("catalogItems").collect();
    const remainingBudget = { value: startingCurrency };

    for (const name of guestInventory) {
        if (inventoryNames.has(name)) continue;
        const catalogItem = catalogItems.find((c) => c.name === name);
        if (!catalogItem) continue;
        const cost = catalogItem.name === "Computer" ? 0 : catalogItem.basePrice ?? 0;
        const cachedCost = catalogCostCache[name] ?? cost;
        if (remainingBudget.value - cachedCost < 0) continue;

        inventoryNames.add(name);
        catalogCostCache[name] = cachedCost;
        remainingBudget.value -= cachedCost;

        await ctx.db.insert("inventory", {
            userId,
            catalogItemId: catalogItem._id,
            purchasedAt: Date.now(),
        });
    }

    return {
        remainingCurrency: Math.max(0, Math.min(remainingBudget.value, startingCurrency)),
        inventoryNames,
        catalogItems,
    };
}

function sanitizeGuestRoomItems(
    items: GuestRoomItem[] | undefined,
    catalogNames: Set<string>
): GuestRoomItem[] {
    if (!items) return [];
    return items
        .slice(0, MAX_GUEST_ITEMS)
        .filter((item) => catalogNames.has(item.catalogItemId))
        .map((item) => ({
            id: item.id,
            catalogItemId: item.catalogItemId,
            x: Number.isFinite(item.x) ? item.x : 0,
            y: Number.isFinite(item.y) ? item.y : 0,
            url: item.url,
            flipped: item.flipped,
            musicUrl: item.musicUrl,
            musicType: item.musicType,
            musicPlaying: item.musicPlaying,
            musicStartedAt: item.musicStartedAt,
            musicPositionAtStart: item.musicPositionAtStart,
            scaleX: Number.isFinite(item.scaleX ?? 1) ? item.scaleX : 1,
            scaleY: Number.isFinite(item.scaleY ?? 1) ? item.scaleY : 1,
            rotation: Number.isFinite(item.rotation ?? 0) ? item.rotation : 0,
            zIndex: Number.isFinite(item.zIndex ?? Date.now()) ? item.zIndex : Date.now(),
        }));
}

function sanitizeGuestShortcuts(shortcuts: GuestShortcut[] | undefined) {
    const trimmed = (shortcuts ?? []).slice(0, MAX_GUEST_ITEMS).map((s) => ({
        id: s.id,
        name: s.name,
        url: s.url,
        row: s.row,
        col: s.col,
        type: s.type,
    }));
    return normalizeShortcutsWithGrid(trimmed);
}

async function seedRoomFromGuest(
    ctx: MutationCtx,
    userId: Id<"users">,
    templateId: Id<"roomTemplates">,
    templateName: string,
    guestItems: GuestRoomItem[] | undefined,
    guestShortcuts: GuestShortcut[] | undefined,
    catalogNames: Set<string>
) {
    const sanitizedItems = sanitizeGuestRoomItems(guestItems, catalogNames);
    const sanitizedShortcuts = sanitizeGuestShortcuts(guestShortcuts).map((s) => ({
        id: s.id,
        name: s.name,
        url: s.url,
    }));

    await ctx.db.insert("rooms", {
        userId,
        templateId,
        name: templateName,
        isActive: true,
        items: sanitizedItems,
        shortcuts: sanitizedShortcuts,
    });
}

const guestRoomItemValidator = v.object({
    id: v.string(),
    catalogItemId: v.string(),
    x: v.number(),
    y: v.number(),
    url: v.optional(v.string()),
    flipped: v.optional(v.boolean()),
    musicUrl: v.optional(v.string()),
    musicType: v.optional(v.union(v.literal("youtube"), v.literal("spotify"))),
    musicPlaying: v.optional(v.boolean()),
    musicStartedAt: v.optional(v.number()),
    musicPositionAtStart: v.optional(v.number()),
    scaleX: v.optional(v.number()),
    scaleY: v.optional(v.number()),
    rotation: v.optional(v.number()),
    zIndex: v.optional(v.number()),
});

const guestShortcutValidator = v.object({
    id: v.string(),
    name: v.string(),
    url: v.string(),
    row: v.optional(v.number()),
    col: v.optional(v.number()),
    type: v.optional(v.union(v.literal("user"), v.literal("system"))),
});


export const ensureUser = mutation({
    args: {
        username: v.string(),
        referralCode: v.optional(v.string()),
        guestCurrency: v.optional(v.number()),
        guestInventory: v.optional(v.array(v.string())),
        guestRoomItems: v.optional(v.array(guestRoomItemValidator)),
        guestShortcuts: v.optional(v.array(guestShortcutValidator)),
        guestSession: v.optional(
            v.object({
                coins: v.optional(v.number()),
                inventoryIds: v.optional(v.array(v.string())),
                roomItems: v.optional(v.array(guestRoomItemValidator)),
                shortcuts: v.optional(v.array(guestShortcutValidator)),
                onboardingCompleted: v.optional(v.boolean()),
            })
        ),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Not authenticated");

        // Prefer Clerk-provided username; fall back to name/email/caller-provided value
        const clerkUsername =
            typeof identity.username === "string" ? identity.username : undefined;
        const clerkName = typeof identity.name === "string" ? identity.name : undefined;
        const tokenIdentifier =
            typeof identity.tokenIdentifier === "string"
                ? identity.tokenIdentifier
                : undefined;
        const derivedUsername =
            clerkUsername ??
            clerkName ??
            // Some providers map the identifier into the tokenIdentifier (e.g., email)
            tokenIdentifier?.split(":").pop() ??
            args.username;
        const derivedDisplayName = clerkName ?? derivedUsername;

        const guestSession = args.guestSession;
        const rawGuestInventory = Array.isArray(guestSession?.inventoryIds)
            ? guestSession?.inventoryIds ?? []
            : Array.isArray(args.guestInventory)
                ? args.guestInventory
                : [];
        const rawGuestRoomItems = (guestSession?.roomItems ?? args.guestRoomItems) as GuestRoomItem[] | undefined;
        const rawGuestShortcuts = (guestSession?.shortcuts ?? args.guestShortcuts) as GuestShortcut[] | undefined;

        const guestSessionState: GuestSessionState = {
            coins: GUEST_STARTING_COINS,
            inventoryIds: rawGuestInventory,
            roomItems: rawGuestRoomItems ?? [],
            shortcuts: rawGuestShortcuts ?? [],
            onboardingCompleted: Boolean(guestSession?.onboardingCompleted),
        };

        const guestInventory = guestSessionState.inventoryIds;
        const guestRoomItems = guestSessionState.roomItems;
        const guestShortcuts = guestSessionState.shortcuts;

        let user = await ctx.db
            .query("users")
            .withIndex("by_externalId", (q) =>
                q.eq("externalId", identity.subject)
            )
            .unique();

        if (!user) {
            let referrerId = undefined;
            const providedReferralCode = args.referralCode;
            if (providedReferralCode) {
                const referrer = await ctx.db
                    .query("users")
                    .withIndex("by_referralCode", (q) =>
                        q.eq("referralCode", providedReferralCode)
                    )
                    .unique();

                if (referrer) {
                    referrerId = referrer._id;
                    await ctx.db.patch(referrer._id, {
                        currency: referrer.currency + 1,
                    });
                }
            }

            let newReferralCode = generateReferralCode();
            let existingCode = await ctx.db
                .query("users")
                .withIndex("by_referralCode", (q) =>
                    q.eq("referralCode", newReferralCode)
                )
                .unique();
            while (existingCode) {
                newReferralCode = generateReferralCode();
                existingCode = await ctx.db
                    .query("users")
                    .withIndex("by_referralCode", (q) =>
                        q.eq("referralCode", newReferralCode)
                    )
                    .unique();
            }

            const computedCurrency = GUEST_STARTING_COINS;

            const id = await ctx.db.insert("users", {
                externalId: identity.subject,
                username: derivedUsername,
                displayName: derivedDisplayName,
                currency: computedCurrency,
                computer: {
                    shortcuts: [],
                },
                onboardingCompleted: guestSessionState.onboardingCompleted === true,
                referralCode: newReferralCode,
                referredBy: referrerId,
            });
            user = await ctx.db.get(id);
            if (user) {
                const {
                    remainingCurrency,
                    inventoryNames,
                    catalogItems,
                } = await importInventoryWithinBudget(ctx, user._id, guestInventory, computedCurrency);

                const starterItem = catalogItems.find((c) => c.name === "Computer");
                if (starterItem && !inventoryNames.has("Computer")) {
                    await ctx.db.insert("inventory", {
                        userId: user._id,
                        catalogItemId: starterItem._id,
                        purchasedAt: Date.now(),
                    });
                }

                await ctx.db.patch(user._id, {
                    currency: remainingCurrency,
                    onboardingCompleted: guestSessionState.onboardingCompleted === true || user.onboardingCompleted === true,
                });

                // Create initial room seeded with guest room state if provided
                const defaultTemplates = await ctx.db
                    .query("roomTemplates")
                    .withIndex("by_default", (q) => q.eq("isDefault", true))
                    .collect();
                const template = defaultTemplates[0];

                if (template) {
                    const catalogNames = new Set(catalogItems.map((c) => c.name));

                    await seedRoomFromGuest(ctx, user._id, template._id, template.name, guestRoomItems, guestShortcuts, catalogNames);
                }
            }
        }

        return user;
    },
});

export const completeOnboarding = mutation({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Not authenticated");

        const user = await ctx.db
            .query("users")
            .withIndex("by_externalId", (q) =>
                q.eq("externalId", identity.subject)
            )
            .unique();

        if (!user) throw new Error("User not found");

        await ctx.db.patch(user._id, {
            onboardingCompleted: true,
        });

        return { success: true };
    },
});

export const claimDailyReward = mutation({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Not authenticated");

        const user = await ctx.db
            .query("users")
            .withIndex("by_externalId", (q) =>
                q.eq("externalId", identity.subject)
            )
            .unique();

        if (!user) throw new Error("User not found");

        const now = Date.now();
        const lastReward = user.lastDailyReward ?? 0;
        const oneDayMs = 24 * 60 * 60 * 1000;

        if (now - lastReward < oneDayMs) {
            return { success: false, message: "Daily reward already claimed" };
        }

        await ctx.db.patch(user._id, {
            currency: user.currency + 1,
            lastDailyReward: now,
        });

        return { success: true, newBalance: user.currency + 1 };
    },
});

const GRID_COLUMNS = 6;

function normalizeShortcutsWithGrid<
    T extends {
        id: string;
        name: string;
        url: string;
        row?: number;
        col?: number;
        type?: "user" | "system";
    }
>(shortcuts: T[]) {
    const occupied = new Set<string>();

    const clamp = (value: number) => Math.max(0, Math.round(value));

    return shortcuts.map((shortcut, index) => {
        let row =
            typeof shortcut.row === "number" && !Number.isNaN(shortcut.row)
                ? clamp(shortcut.row)
                : Math.floor(index / GRID_COLUMNS);
        let col =
            typeof shortcut.col === "number" && !Number.isNaN(shortcut.col)
                ? clamp(shortcut.col)
                : index % GRID_COLUMNS;

        // Resolve collisions by walking forward in row-major order
        while (occupied.has(`${row}-${col}`)) {
            col++;
            if (col >= GRID_COLUMNS) {
                col = 0;
                row++;
            }
        }
        occupied.add(`${row}-${col}`);

        return {
            ...shortcut,
            row,
            col,
            type: shortcut.type ?? "user",
        };
    });
}

export const getMyComputer = query({
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

        if (!user) return null;

        // If user has computer state, ensure it has grid positions
        if (user.computer) {
            const needsNormalization = user.computer.shortcuts.some(
                (shortcut) =>
                    typeof shortcut.row !== "number" ||
                    typeof shortcut.col !== "number"
            );

            if (needsNormalization) {
                const normalized = normalizeShortcutsWithGrid(
                    user.computer.shortcuts
                );
                return { shortcuts: normalized };
            }

            return user.computer;
        }

        // Migrate from the active room shortcuts if present
        const rooms = await ctx.db
            .query("rooms")
            .withIndex("by_user_active", (q) =>
                q.eq("userId", user._id).eq("isActive", true)
            )
            .collect();
        const activeRoom = rooms[0];
        const migrated =
            activeRoom?.shortcuts && activeRoom.shortcuts.length > 0
                ? normalizeShortcutsWithGrid(activeRoom.shortcuts)
                : [];

        const computerState = { shortcuts: migrated };

        return computerState;
    },
});

export const saveMyComputer = mutation({
    args: {
        shortcuts: v.array(
            v.object({
                id: v.string(),
                name: v.string(),
                url: v.string(),
                row: v.number(),
                col: v.number(),
                type: v.optional(
                    v.union(v.literal("user"), v.literal("system"))
                ),
            })
        ),
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

        const normalized = normalizeShortcutsWithGrid(args.shortcuts);

        await ctx.db.patch(user._id, {
            computer: { shortcuts: normalized },
        });

        return { success: true };
    },
});
