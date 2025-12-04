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

// Generate a short, readable referral code
function generateReferralCode(): string {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Exclude confusing chars like 0/O, 1/I
    let code = "";
    for (let i = 0; i < 8; i++) {
        code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
}

export const ensureUser = mutation({
    args: {
        username: v.string(),
        referralCode: v.optional(v.string()),
    },
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

            const id = await ctx.db.insert("users", {
                externalId: identity.subject,
                username: args.username,
                displayName: identity.name ?? args.username,
                avatarConfig: {},
                currency: 5,
                onboardingCompleted: false,
                referralCode: newReferralCode,
                referredBy: referrerId,
            });
            user = await ctx.db.get(id);

            if (user) {
                const starterItem = await ctx.db
                    .query("catalogItems")
                    .withIndex("by_name", (q) => q.eq("name", "Computer"))
                    .unique();

                if (starterItem) {
                    await ctx.db.insert("inventory", {
                        userId: user._id,
                        catalogItemId: starterItem._id,
                        purchasedAt: Date.now(),
                    });
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
