import { query, mutation } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import type { Id, Doc } from "./_generated/dataModel";
import {
    GUEST_STARTING_COINS,
    STARTER_COMPUTER_NAME,
    type GuestRoomItem,
    type GuestSessionState,
    type GuestShortcut,
} from "../shared/guestTypes";
import { getDayDelta, getMountainDayKey, getNextMountainMidnightUtc } from "./lib/time";

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

async function ensureStarterComputer(
    ctx: MutationCtx,
    userId: Id<"users">,
    catalogItems?: Doc<"catalogItems">[]
) {
    const catalog = catalogItems ?? (await ctx.db.query("catalogItems").collect());
    const starterItem = catalog.find((c) => c.name === STARTER_COMPUTER_NAME) ?? null;
    if (!starterItem) return false;

    const existing = await ctx.db
        .query("inventory")
        .withIndex("by_user_and_item", (q) =>
            q.eq("userId", userId).eq("catalogItemId", starterItem._id)
        )
        .unique();

    if (existing) return true;

    await ctx.db.insert("inventory", {
        userId,
        catalogItemId: starterItem._id,
        purchasedAt: Date.now(),
        hidden: false,
    });

    return true;
}

async function importInventoryWithinBudget(
    ctx: MutationCtx,
    userId: Id<"users">,
    guestInventory: string[],
    startingCurrency: number
) {
    const inventoryNames = new Set<string>();
    const seenCatalogIds = new Set<string>();
    const catalogCostCache: Record<string, number> = {};
    const catalogItems: Doc<"catalogItems">[] = await ctx.db.query("catalogItems").collect();
    const remainingBudget = { value: startingCurrency };

    const resolveCatalogItem = (idOrName: string) =>
        catalogItems.find(
            (c) => c.name === idOrName || (c._id as unknown as string) === idOrName
        );

    for (const idOrName of guestInventory) {
        const catalogItem = resolveCatalogItem(idOrName);
        if (!catalogItem) continue;
        const catalogKey = catalogItem._id as unknown as string;
        if (seenCatalogIds.has(catalogKey)) continue;
        const cost = catalogItem.name === STARTER_COMPUTER_NAME ? 0 : catalogItem.basePrice ?? 0;
        const cachedCost = catalogCostCache[catalogKey] ?? cost;
        if (remainingBudget.value - cachedCost < 0) continue;

        seenCatalogIds.add(catalogKey);
        inventoryNames.add(catalogItem.name);
        catalogCostCache[catalogKey] = cachedCost;
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
    const sanitizedShortcuts = sanitizeGuestShortcuts(guestShortcuts);

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
    musicType: v.optional(v.literal("youtube")),
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
        const rawGuestRoomItems = (guestSession?.roomItems ?? args.guestRoomItems) as GuestRoomItem[] | undefined;
        const rawGuestShortcuts = (guestSession?.shortcuts ?? args.guestShortcuts) as GuestShortcut[] | undefined;

        const guestCursorColor =
            typeof guestSession?.cursorColor === "string"
                ? guestSession.cursorColor
                : typeof args.guestCursorColor === "string"
                    ? args.guestCursorColor
                    : undefined;
        const guestSessionState: GuestSessionState = {
            coins: reportedGuestCoins,
            inventoryIds: rawGuestInventory,
            roomItems: rawGuestRoomItems ?? [],
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

        let catalogItemsCache: Doc<"catalogItems">[] | null = null;
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
                    await ctx.db.patch(referrer._id, {
                        currency: referrer.currency + 1,
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
                currency: computedCurrency,
                cursorColor,
                computer: {
                    shortcuts: normalizedGuestShortcuts,
                    cursorColor,
                },
                loginStreak: 0,
                onboardingCompleted: guestSessionState.onboardingCompleted === true,
                referralCode: newReferralCode,
                referredBy: referrerId,
            });
            user = await ctx.db.get(id);
            if (user) {
                const {
                    remainingCurrency,
                    catalogItems,
                } = await importInventoryWithinBudget(ctx, user._id, guestInventory, GUEST_STARTING_COINS);

                catalogItemsCache = catalogItems;

                await ctx.db.patch(user._id, {
                    currency: Math.min(remainingCurrency, reportedGuestCoins),
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

                    await seedRoomFromGuest(
                        ctx,
                        user._id,
                        template._id,
                        template.name,
                        guestRoomItems,
                        normalizedGuestShortcuts,
                        catalogNames
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
                        cursorColor: guestCursorColor,
                    },
                });
            }

            await ensureStarterComputer(ctx, user._id, catalogItemsCache ?? undefined);
        }

        return user;
    },
});

export const updateDisplayName = mutation({
    args: { displayName: v.string() },
    handler: async (ctx, args) => {
        const { user } = await requireUser(ctx);
        const next = args.displayName.trim();
        if (next.length < 2) {
            throw new Error("Display name must be at least 2 characters");
        }
        if (next.length > 50) {
            throw new Error("Display name must be at most 50 characters");
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

        await ctx.db.patch(user._id, {
            currency: user.currency + 1,
            lastDailyRewardDay: todayKey,
            loginStreak: nextStreak,
        });

        return {
            success: true,
            newBalance: user.currency + 1,
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

        const computerState = { shortcuts: migrated, cursorColor };

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

        await ctx.db.patch(user._id, {
            computer: { shortcuts: normalized, cursorColor: args.cursorColor ?? user.cursorColor },
            cursorColor: args.cursorColor ?? user.cursorColor,
        });

        return { success: true, cursorColor: args.cursorColor ?? user.cursorColor };
    },
});
