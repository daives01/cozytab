import { query, mutation, internalMutation, internalQuery } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { getDayDelta, getMountainDayKey, getNextMountainMidnightUtc } from "./lib/time";
import { applyCurrencyChange } from "./lib/currency";
import { getCurrentUser, requireIdentity, requireUserWithIdentity as requireUser } from "./lib/auth";
import { clampVolume, normalizeShortcutsWithGrid, randomBrightColor } from "./lib/userSettings";

async function findUserByExternalId(ctx: QueryCtx | MutationCtx, externalId: string) {
    return await ctx.db
        .query("users")
        .withIndex("by_externalId", (query) => query.eq("externalId", externalId))
        .unique();
}

async function getUserForRequest(ctx: QueryCtx | MutationCtx) {
    return { user: await getCurrentUser(ctx) };
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
            .withIndex("by_referredBy", (q) => q.eq("referredBy", user._id))
            .collect();

        const referralTransactions = await ctx.db
            .query("currencyTransactions")
            .withIndex("by_user", (q) => q.eq("userId", user._id))
            .filter((q) => q.eq(q.field("reason"), "referral"))
            .collect();

        return {
            referralCount: referredUsers.length,
            // Use recorded rewards so historical amounts survive reward-rate changes.
            referralCoins: referralTransactions.reduce((total, transaction) => total + transaction.delta, 0),
        };
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
        const nodeEnv = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env
            ?.NODE_ENV;

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

export const getMyComputer = query({
    args: {},
    handler: async (ctx) => {
        const { user } = await getUserForRequest(ctx);

        if (!user) return null;

        const existingShortcuts = user.computer?.shortcuts ?? [];

        const needsNormalization = existingShortcuts.some(
            (shortcut) => typeof shortcut.row !== "number" || typeof shortcut.col !== "number",
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
            }),
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

export const giftCoins = internalMutation({
    args: {
        userId: v.id("users"),
        amount: v.number(),
        note: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        if (args.amount <= 0) {
            throw new Error("Gift amount must be positive");
        }

        const user = await ctx.db.get(args.userId);

        if (!user) {
            throw new Error("User not found");
        }

        const result = await applyCurrencyChange({
            ctx,
            userId: args.userId,
            delta: args.amount,
            reason: "gift",
            idempotencyKey: `gift:${args.userId}:${Date.now()}`,
            metadata: args.note ? { note: args.note } : undefined,
        });

        return {
            applied: result.applied,
            newBalance: result.balance,
            username: user.username,
        };
    },
});
