import { query, mutation, internalMutation, internalQuery } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import type { Id, Doc } from "./_generated/dataModel";
import { GUEST_STARTING_COINS, type RoomItem, type GuestSessionState, type GuestShortcut } from "@shared/guestTypes";
import { getDayDelta, getMountainDayKey, getNextMountainMidnightUtc } from "./lib/time";
import { applyCurrencyChange } from "./lib/currency";

type AnyCtx = QueryCtx | MutationCtx;

async function getIdentity(ctx: AnyCtx) {
    return await ctx.auth.getUserIdentity();
}

async function findUserByExternalId(ctx: AnyCtx, externalId: string) {
    return await ctx.db
        .query("users")
        .withIndex("by_externalId", (q) => q.eq("externalId", externalId))
        .unique();
}

async function getUserForRequest(ctx: AnyCtx) {
    const identity = await getIdentity(ctx);
    if (!identity) return { identity: null, user: null };
    const user = await findUserByExternalId(ctx, identity.subject);
    return { identity, user };
}

async function requireIdentity(ctx: AnyCtx) {
    const identity = await getIdentity(ctx);
    if (!identity) throw new Error("Not authenticated");
    return identity;
}

async function requireUser(ctx: AnyCtx) {
    const identity = await requireIdentity(ctx);
    const user = await findUserByExternalId(ctx, identity.subject);
    if (!user) throw new Error("User not found");
    return { identity, user };
}

type DerivedNames = { username: string; displayName: string };

function normalizeString(value: unknown) {
    return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function pickFirst<T>(...values: (T | undefined)[]): T | undefined {
    return values.find((value) => value !== undefined);
}

function buildIdentityName(identity: Awaited<ReturnType<typeof getIdentity>>) {
    const givenName =
        normalizeString((identity as { firstName?: string }).firstName) ??
        normalizeString((identity as { givenName?: string }).givenName);
    const familyName =
        normalizeString((identity as { lastName?: string }).lastName) ??
        normalizeString((identity as { familyName?: string }).familyName);
    const explicitName = normalizeString(identity?.name);

    return (
        explicitName ??
        (givenName && familyName ? `${givenName} ${familyName}` : undefined) ??
        givenName ??
        familyName
    );
}

function getEmailLocal(identity: Awaited<ReturnType<typeof getIdentity>>, tokenTail?: string) {
    const rawEmail =
        normalizeString((identity as { email?: string }).email) ??
        normalizeString((identity as { emailAddress?: string }).emailAddress) ??
        (tokenTail?.includes("@") ? tokenTail : undefined);
    return rawEmail?.split("@")[0];
}

function deriveNames(identity: Awaited<ReturnType<typeof getIdentity>>, fallbackUsername: string): DerivedNames {
    // Values the user chose should win over provider-derived values.
    const providedUsername = normalizeString(fallbackUsername);

    const identityUsername = normalizeString(identity?.username);
    const tokenIdentifier =
        typeof identity?.tokenIdentifier === "string"
            ? identity.tokenIdentifier
            : undefined;
    const tokenTail = tokenIdentifier?.split(":").pop();
    const identityName = buildIdentityName(identity);
    const emailLocal = getEmailLocal(identity, tokenTail);

    const username = pickFirst(
        providedUsername,
        identityUsername,
        emailLocal,
        identityName,
        tokenTail,
        "user"
    )!;

    const displayName = pickFirst(
        providedUsername,
        identityName,
        identityUsername,
        emailLocal,
        tokenTail,
        "Guest"
    )!;

    return { username, displayName };
}

export const getMe = query({
    args: {},
    handler: async (ctx) => {
        const { user } = await getUserForRequest(ctx);
        if (!user) return null;

        const now = Date.now();
        return {
            ...user,
            nextRewardAt: getNextMountainMidnightUtc(now),
        };
    },
});

export const getKeyboardSoundSettings = query({
    args: {},
    handler: async (ctx) => {
        const { user } = await getUserForRequest(ctx);
        if (!user) return null;

        return {
            volume: clampVolume(user.keyboardSoundVolume, 0.5),
            musicVolume: clampVolume(user.musicPlayerVolume, 0.7),
        };
    },
});

export const isAdmin = query({
    args: {},
    handler: async (ctx) => {
        const { user } = await getUserForRequest(ctx);
        return user?.admin === true;
    },
});

export const getMyReferralCode = query({
    args: {},
    handler: async (ctx) => {
        const { user } = await getUserForRequest(ctx);
        return user?.referralCode ?? null;
    },
});

export const getReferralStats = query({
    args: {},
    handler: async (ctx) => {
        const { user } = await getUserForRequest(ctx);
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
            referralCoins: referralCount, // one cozy coin per referral
        };
    },
});

function generateReferralCode(): string {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";
    for (let i = 0; i < 8; i++) {
        code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
}

async function generateUniqueReferralCode(ctx: MutationCtx) {
    let referralCode = generateReferralCode();
    let existing = await ctx.db
        .query("users")
        .withIndex("by_referralCode", (q) => q.eq("referralCode", referralCode))
        .unique();

    while (existing) {
        referralCode = generateReferralCode();
        existing = await ctx.db
            .query("users")
            .withIndex("by_referralCode", (q) => q.eq("referralCode", referralCode))
            .unique();
    }

    return referralCode;
}

const MAX_GUEST_ITEMS = 100;

function clampGuestCoins(value: unknown): number {
    if (typeof value !== "number" || Number.isNaN(value)) return GUEST_STARTING_COINS;
    return Math.max(0, Math.min(GUEST_STARTING_COINS, value));
}

function clampVolume(value: unknown, fallback = 0.5): number {
    if (typeof value !== "number" || Number.isNaN(value)) return fallback;
    return Math.max(0, Math.min(1, value));
}

function randomBrightColor(): string {
    const hue = Math.floor(Math.random() * 360);
    const saturation = 70 + Math.floor(Math.random() * 30);
    const lightness = 55 + Math.floor(Math.random() * 15);
    return hslToHex(hue, saturation, lightness);
}

function hslToHex(h: number, s: number, l: number): string {
    const sat = s / 100;
    const light = l / 100;
    const c = (1 - Math.abs(2 * light - 1)) * sat;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = light - c / 2;
    let r = 0, g = 0, b = 0;

    if (h >= 0 && h < 60) {
        r = c; g = x; b = 0;
    } else if (h >= 60 && h < 120) {
        r = x; g = c; b = 0;
    } else if (h >= 120 && h < 180) {
        r = 0; g = c; b = x;
    } else if (h >= 180 && h < 240) {
        r = 0; g = x; b = c;
    } else if (h >= 240 && h < 300) {
        r = x; g = 0; b = c;
    } else {
        r = c; g = 0; b = x;
    }

    const toHex = (value: number) => {
        const hex = Math.round((value + m) * 255).toString(16).padStart(2, "0");
        return hex;
    };

    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

async function importInventoryWithinBudget(
    ctx: MutationCtx,
    userId: Id<"users">,
    guestInventory: string[],
    reportedCoins: number
) {
    const inventoryNames = new Set<string>();
    const catalogItems: Doc<"catalogItems">[] = await ctx.db.query("catalogItems").collect();
    const totalBudget = GUEST_STARTING_COINS;
    const safeReportedCoins = Math.max(0, reportedCoins);
    const maxSpend = Math.max(0, totalBudget - safeReportedCoins);
    let spent = 0;
    const counts = new Map<string, number>();
    const starterFreeGranted = new Set<string>();

    const resolveCatalogItem = (idOrName: string) =>
        catalogItems.find((c) => c.name === idOrName || (c._id as unknown as string) === idOrName);

    for (const idOrName of guestInventory) {
        const catalogItem = resolveCatalogItem(idOrName);
        if (!catalogItem) continue;
        const catalogKey = catalogItem._id as unknown as string;
        const baseCost = catalogItem.basePrice ?? 0;
        const cost = catalogItem.isStarterItem && !starterFreeGranted.has(catalogKey) ? 0 : baseCost;
        if (spent + cost > maxSpend) continue;

        inventoryNames.add(catalogItem.name);
        spent += cost;
        if (catalogItem.isStarterItem && cost === 0) {
            starterFreeGranted.add(catalogKey);
        }
        counts.set(catalogKey, (counts.get(catalogKey) ?? 0) + 1);
    }

    for (const [catalogKey, count] of counts.entries()) {
        const catalogItem = catalogItems.find((c) => (c._id as unknown as string) === catalogKey);
        if (!catalogItem) continue;
        await ctx.db.insert("inventory", {
            userId,
            catalogItemId: catalogItem._id,
            purchasedAt: Date.now(),
            count,
        });
    }

    return {
        remainingCurrency: Math.max(0, totalBudget - spent),
        inventoryNames,
        catalogItems,
    };
}

function sanitizeRoomItems(
    items: RoomItem[] | undefined,
    catalogByName: Map<string, Id<"catalogItems">>,
    catalogIds: Set<Id<"catalogItems">>
): Array<RoomItem & { catalogItemId: Id<"catalogItems"> }> {
    if (!items) return [];
    const sanitized: Array<RoomItem & { catalogItemId: Id<"catalogItems"> }> = [];
    for (const item of items.slice(0, MAX_GUEST_ITEMS)) {
        const asId = item.catalogItemId as Id<"catalogItems">;
        const catalogId = catalogIds.has(asId) ? asId : catalogByName.get(item.catalogItemId);
        if (!catalogId) continue;

        sanitized.push({
            id: item.id,
            catalogItemId: catalogId,
            x: Number.isFinite(item.x) ? item.x : 0,
            y: Number.isFinite(item.y) ? item.y : 0,
            url: item.url,
            flipped: item.flipped,
            musicUrl: item.musicUrl,
            musicType: item.musicType,
            musicPlaying: item.musicPlaying,
            musicStartedAt: item.musicStartedAt,
            musicPositionAtStart: item.musicPositionAtStart,
        });
    }
    return sanitized;
}

function sanitizeGuestShortcuts(shortcuts: GuestShortcut[] | undefined) {
    const trimmed = (shortcuts ?? []).slice(0, MAX_GUEST_ITEMS).map((s) => ({
        id: s.id,
        name: s.name,
        url: s.url,
        row: s.row,
        col: s.col,
    }));
    return normalizeShortcutsWithGrid(trimmed);
}

async function seedRoomFromGuest(
    ctx: MutationCtx,
    userId: Id<"users">,
    templateId: Id<"roomTemplates">,
    templateName: string,
    guestItems: RoomItem[] | undefined,
    catalogByName: Map<string, Id<"catalogItems">>,
    catalogIds: Set<Id<"catalogItems">>
) {
    const sanitizedItems = sanitizeRoomItems(guestItems, catalogByName, catalogIds);

    await ctx.db.insert("rooms", {
        userId,
        templateId,
        name: templateName,
        isActive: true,
        items: sanitizedItems,
    });
}

const guestRoomItemValidator = v.object({
    id: v.string(),
    catalogItemId: v.id("catalogItems"),
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

const guestShortcutValidator = v.object({
    id: v.string(),
    name: v.string(),
    url: v.string(),
    row: v.optional(v.number()),
    col: v.optional(v.number()),
});


export const ensureUser = mutation({
    args: {
        username: v.string(),
        referralCode: v.optional(v.string()),
        guestCurrency: v.optional(v.number()),
        guestInventory: v.optional(v.array(v.string())),
        guestRoomItems: v.optional(v.array(guestRoomItemValidator)),
        guestShortcuts: v.optional(v.array(guestShortcutValidator)),
        guestCursorColor: v.optional(v.string()),
        guestSession: v.optional(
            v.object({
                coins: v.optional(v.number()),
                inventoryIds: v.optional(v.array(v.string())),
                roomItems: v.optional(v.array(guestRoomItemValidator)),
                shortcuts: v.optional(v.array(guestShortcutValidator)),
                onboardingCompleted: v.optional(v.boolean()),
                cursorColor: v.optional(v.string()),
            })
        ),
    },
    handler: async (ctx, args) => {
        const identity = await requireIdentity(ctx);

        const { username: derivedUsername, displayName: derivedDisplayName } = deriveNames(
            identity,
            args.username
        );

        const guestSession = args.guestSession;
        const reportedGuestCoins = clampGuestCoins(
            guestSession?.coins ?? args.guestCurrency
        );
        const rawGuestInventory = Array.isArray(guestSession?.inventoryIds)
            ? guestSession?.inventoryIds ?? []
            : Array.isArray(args.guestInventory)
                ? args.guestInventory
                : [];
        const rawRoomItems = (guestSession?.roomItems ?? args.guestRoomItems) as RoomItem[] | undefined;
        const rawGuestShortcuts = (guestSession?.shortcuts ?? args.guestShortcuts) as GuestShortcut[] | undefined;

        const guestCursorColor =
            typeof guestSession?.cursorColor === "string"
                ? guestSession.cursorColor
                : typeof args.guestCursorColor === "string"
                    ? args.guestCursorColor
                    : undefined;
        const guestSessionState: GuestSessionState = {
            coins: reportedGuestCoins,
            inventoryIds: rawGuestInventory as unknown as Id<"catalogItems">[],
            roomItems: rawRoomItems ?? [],
            shortcuts: rawGuestShortcuts ?? [],
            onboardingCompleted: Boolean(guestSession?.onboardingCompleted),
            cursorColor:
                typeof guestSession?.cursorColor === "string" && guestSession.cursorColor.trim().length > 0
                    ? guestSession.cursorColor
                    : guestCursorColor ?? randomBrightColor(),
        };

        const guestInventory = guestSessionState.inventoryIds;
        const guestRoomItems = guestSessionState.roomItems;
        const guestShortcuts = guestSessionState.shortcuts;
        const normalizedGuestShortcuts = sanitizeGuestShortcuts(guestShortcuts);

        let user = await findUserByExternalId(ctx, identity.subject);

        if (!user) {
            let referrerId: Id<"users"> | undefined;
            const providedReferralCode = args.referralCode?.trim();
            if (providedReferralCode) {
                const referrer = await ctx.db
                    .query("users")
                    .withIndex("by_referralCode", (q) =>
                        q.eq("referralCode", providedReferralCode)
                    )
                    .unique();

                if (referrer) {
                    referrerId = referrer._id;
                    await applyCurrencyChange({
                        ctx,
                        userId: referrer._id,
                        delta: 3,
                        reason: "referral",
                        idempotencyKey: `referral:${referrer._id}:${identity.subject}`,
                        metadata: { referredExternalId: identity.subject },
                    });
                }
            }

            const newReferralCode = await generateUniqueReferralCode(ctx);

            const computedCurrency = reportedGuestCoins;
            const cursorColor = guestCursorColor ?? randomBrightColor();

            const id = await ctx.db.insert("users", {
                externalId: identity.subject,
                username: derivedUsername,
                displayName: derivedDisplayName,
                currency: 0,
                cursorColor,
                computer: {
                    shortcuts: normalizedGuestShortcuts,
                },
                loginStreak: 0,
                onboardingCompleted: guestSessionState.onboardingCompleted === true,
                referralCode: newReferralCode,
                referredBy: referrerId,
            });
            user = await ctx.db.get(id);
            if (user) {
                const starting = await applyCurrencyChange({
                    ctx,
                    userId: user._id,
                    delta: computedCurrency,
                    reason: "starting_balance",
                    idempotencyKey: `starting:${user._id}`,
                    metadata: { source: "guest_session", reportedGuestCoins },
                });
                user = { ...user, currency: starting.balance };

                const { remainingCurrency, catalogItems } = await importInventoryWithinBudget(
                    ctx,
                    user._id,
                    guestInventory,
                    reportedGuestCoins
                );

                const targetCurrency = Math.min(remainingCurrency, reportedGuestCoins);
                const adjustmentDelta = targetCurrency - computedCurrency;
                if (adjustmentDelta !== 0) {
                    const adjustment = await applyCurrencyChange({
                        ctx,
                        userId: user._id,
                        delta: adjustmentDelta,
                        reason: "guest_import",
                        idempotencyKey: `guest_import:${user._id}`,
                        metadata: {
                            reportedGuestCoins,
                            targetCurrency,
                            spent: computedCurrency - targetCurrency,
                        },
                    });
                    user = { ...user, currency: adjustment.balance };
                }

                await ctx.db.patch(user._id, {
                    onboardingCompleted: guestSessionState.onboardingCompleted === true || user.onboardingCompleted === true,
                });

                // Create initial room seeded with guest room state if provided
                const defaultTemplates = await ctx.db
                    .query("roomTemplates")
                    .withIndex("by_default", (q) => q.eq("isDefault", true))
                    .collect();
                const template = defaultTemplates[0];

                if (template) {
                    const catalogByName = new Map<string, Id<"catalogItems">>(
                        catalogItems.map((c) => [c.name, c._id])
                    );
                    const catalogIds = new Set<Id<"catalogItems">>(catalogItems.map((c) => c._id));

                    await seedRoomFromGuest(
                        ctx,
                        user._id,
                        template._id,
                        template.name,
                        guestRoomItems,
                        catalogByName,
                        catalogIds
                    );
                }
            }
        }

        if (user) {
            const updates: Partial<Doc<"users">> = {};
            if (!user.username) {
                updates.username = derivedUsername;
            }
            if (!user.displayName) {
                updates.displayName = derivedDisplayName;
            }
            if (!user.cursorColor && guestCursorColor) {
                updates.cursorColor = guestCursorColor;
            }
            if (Object.keys(updates).length > 0) {
                await ctx.db.patch(user._id, updates);
                user = { ...user, ...updates };
            }

            if (guestCursorColor) {
                const normalized = normalizeShortcutsWithGrid(guestShortcuts ?? []);
                await ctx.db.patch(user._id, {
                    computer: {
                        shortcuts: normalized,
                    },
                    cursorColor: guestCursorColor,
                });
            }
        }

        return user;
    },
});

export const updateDisplayName = mutation({
    args: { displayName: v.string() },
    handler: async (ctx, args) => {
        const { user } = await requireUser(ctx);
        const trimmed = args.displayName.trim();
        const next = trimmed.slice(0, 50);
        if (next.length < 2) {
            throw new Error("Display name must be at least 2 characters");
        }

        await ctx.db.patch(user._id, { displayName: next });
        return { displayName: next };
    },
});

export const completeOnboarding = mutation({
    args: {},
    handler: async (ctx) => {
        const { user } = await requireUser(ctx);

        await ctx.db.patch(user._id, {
            onboardingCompleted: true,
        });

        return { success: true };
    },
});

export const claimDailyReward = mutation({
    args: {},
    handler: async (ctx) => {
        const { user } = await requireUser(ctx);

        const now = Date.now();
        const todayKey = getMountainDayKey(now);
        const nextRewardAt = getNextMountainMidnightUtc(now);

        if (user.lastDailyRewardDay === todayKey) {
            return {
                success: false,
                message: "Daily reward already claimed",
                nextRewardAt,
                loginStreak: user.loginStreak ?? 0,
                lastDailyRewardDay: user.lastDailyRewardDay,
            };
        }

        const dayDelta = getDayDelta(user.lastDailyRewardDay, todayKey);
        const previousStreak = user.loginStreak ?? 0;
        const nextStreak = dayDelta === 1 ? previousStreak + 1 : 1;
        const idempotencyKey = `daily:${user._id}:${todayKey}`;

        const change = await applyCurrencyChange({
            ctx,
            userId: user._id,
            delta: 1,
            reason: "daily_reward",
            idempotencyKey,
            metadata: { day: todayKey },
        });

        if (!change.applied) {
            return {
                success: false,
                message: "Daily reward already claimed",
                nextRewardAt,
                loginStreak: user.loginStreak ?? previousStreak,
                lastDailyRewardDay: user.lastDailyRewardDay,
            };
        }

        await ctx.db.patch(user._id, {
            lastDailyRewardDay: todayKey,
            loginStreak: nextStreak,
        });

        return {
            success: true,
            newBalance: change.balance,
            lastDailyRewardDay: todayKey,
            loginStreak: nextStreak,
            nextRewardAt,
        };
    },
});

export const devDeleteMyAccount = mutation({
    args: {},
    handler: async (ctx) => {
        const nodeEnv =
            (globalThis as { process?: { env?: Record<string, string | undefined> } })
                .process?.env?.NODE_ENV;
        if (nodeEnv !== "development") {
            throw new Error("Dev-only mutation");
        }

        const identity = await requireIdentity(ctx);
        const user = await findUserByExternalId(ctx, identity.subject);

        if (!user) {
            return { deleted: false };
        }

        const rooms = await ctx.db
            .query("rooms")
            .withIndex("by_user", (q) => q.eq("userId", user._id))
            .collect();

        for (const room of rooms) {
            const invites = await ctx.db
                .query("roomInvites")
                .withIndex("by_room", (q) => q.eq("roomId", room._id))
                .collect();
            for (const invite of invites) {
                await ctx.db.delete(invite._id);
            }
            await ctx.db.delete(room._id);
        }

        const inventory = await ctx.db
            .query("inventory")
            .withIndex("by_user", (q) => q.eq("userId", user._id))
            .collect();

        for (const item of inventory) {
            await ctx.db.delete(item._id);
        }

        await ctx.db.delete(user._id);

        return { deleted: true };
    },
});

export const backfillCurrencyLedger = internalMutation({
    args: {},
    handler: async (ctx) => {
        const users = await ctx.db.query("users").collect();
        let created = 0;
        let skipped = 0;

        for (const ledgerUser of users) {
            const idempotencyKey = `starting:${ledgerUser._id}`;
            const existing = await ctx.db
                .query("currencyTransactions")
                .withIndex("by_idempotencyKey", (q) => q.eq("idempotencyKey", idempotencyKey))
                .unique();
            if (existing) {
                skipped++;
                continue;
            }

            await ctx.db.insert("currencyTransactions", {
                userId: ledgerUser._id,
                delta: ledgerUser.currency,
                reason: "starting_balance",
                idempotencyKey,
                createdAt: Date.now(),
                metadata: { source: "backfill" },
            });
            created++;
        }

        return { created, skipped };
    },
});

export const reconcileCurrencyBalances = internalMutation({
    args: {
        limit: v.optional(v.number()),
        repair: v.optional(v.boolean()),
    },
    handler: async (ctx, args) => {
        const limit = Math.max(1, args.limit ?? 100);
        const repair = args.repair === true;
        const users = await ctx.db.query("users").collect();

        const mismatches: Array<{
            userId: Id<"users">;
            externalId: string;
            ledgerSum: number;
            recorded: number;
            delta: number;
        }> = [];
        let repaired = 0;

        for (const target of users) {
            if (mismatches.length >= limit) break;

            const transactions = await ctx.db
                .query("currencyTransactions")
                .withIndex("by_user", (q) => q.eq("userId", target._id))
                .collect();
            const ledgerSum = transactions.reduce((sum, tx) => sum + tx.delta, 0);
            const delta = ledgerSum - target.currency;
            if (delta !== 0) {
                mismatches.push({
                    userId: target._id,
                    externalId: target.externalId,
                    ledgerSum,
                    recorded: target.currency,
                    delta,
                });
                if (repair) {
                    const adjustment = await applyCurrencyChange({
                        ctx,
                        userId: target._id,
                        delta,
                        reason: "admin_adjustment",
                        idempotencyKey: `reconcile:${target._id}:${ledgerSum}:${target.currency}`,
                        metadata: {
                            ledgerSum,
                            recorded: target.currency,
                            delta,
                        },
                    });
                    if (adjustment.applied) {
                        repaired++;
                    }
                }
            }
        }

        return { mismatches, repaired };
    },
});

export const getByExternalId = internalQuery({
    args: { externalId: v.string() },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("users")
            .withIndex("by_externalId", (q) => q.eq("externalId", args.externalId))
            .unique();
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
        };
    });
}

export const getMyComputer = query({
    args: {},
    handler: async (ctx) => {
        const { user } = await getUserForRequest(ctx);
        if (!user) return null;

        const existingShortcuts = user.computer?.shortcuts ?? [];
        const needsNormalization = existingShortcuts.some(
            (shortcut) =>
                typeof shortcut.row !== "number" ||
                typeof shortcut.col !== "number"
        );

        const cursorColor = user.cursorColor ?? randomBrightColor();

        if (needsNormalization) {
            const normalized = normalizeShortcutsWithGrid(existingShortcuts);
            return { shortcuts: normalized, cursorColor };
        }

        if (existingShortcuts.length > 0) {
            return { shortcuts: existingShortcuts, cursorColor };
        }

        const computerState = { shortcuts: [], cursorColor };

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
            })
        ),
        cursorColor: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const { user } = await requireUser(ctx);

        const normalized = normalizeShortcutsWithGrid(args.shortcuts);
        const nextCursorColor = args.cursorColor ?? user.cursorColor ?? randomBrightColor();

        await ctx.db.patch(user._id, {
            computer: { shortcuts: normalized },
            cursorColor: nextCursorColor,
        });

        return { success: true, cursorColor: nextCursorColor };
    },
});

export const saveKeyboardSoundSettings = mutation({
    args: {
        volume: v.number(),
        musicVolume: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const { user } = await requireUser(ctx);
        const clampedVolume = clampVolume(args.volume, 0.5);
        const clampedMusicVolume = clampVolume(args.musicVolume ?? user.musicPlayerVolume, 0.7);

        await ctx.db.patch(user._id, {
            keyboardSoundVolume: clampedVolume,
            musicPlayerVolume: clampedMusicVolume,
        });

        return { volume: clampedVolume, musicVolume: clampedMusicVolume };
    },
});

export const saveMusicPlayerVolume = mutation({
    args: {
        volume: v.number(),
    },
    handler: async (ctx, args) => {
        const { user } = await requireUser(ctx);
        const clamped = clampVolume(args.volume, 0.7);
        await ctx.db.patch(user._id, { musicPlayerVolume: clamped });
        return { volume: clamped };
    },
});

