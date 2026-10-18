import { describe, expect, test } from "bun:test";
import { api } from "@convex/_generated/api";
import { asUser, createConvexTest, seedUser } from "./convexTestUtils";

describe("referral stats", () => {
    test("returns zero counts and earnings without a current user or rewards", async () => {
        const t = createConvexTest();
        const emptyStats = { referralCount: 0, referralCoins: 0 };

        expect(await t.query(api.users.getReferralStats, {})).toEqual(emptyStats);
        expect(await asUser(t, "not-created").query(api.users.getReferralStats, {})).toEqual(emptyStats);
        await seedUser(t, "no-referrals");
        expect(await asUser(t, "no-referrals").query(api.users.getReferralStats, {})).toEqual(emptyStats);
    });

    test("counts referred users separately from historical ledger earnings", async () => {
        const t = createConvexTest();
        const referrerId = await seedUser(t, "referrer", 0);
        const otherId = await seedUser(t, "other");
        const firstId = await seedUser(t, "first");
        const secondId = await seedUser(t, "second");
        const unrecordedId = await seedUser(t, "unrecorded");
        await t.run(async (ctx) => {
            for (const userId of [firstId, secondId, unrecordedId]) {
                await ctx.db.patch(userId, { referredBy: referrerId });
            }
            // Different historical reward rates, unrelated income/spending, and
            // another user's reward must not be replaced by count * today's rate.
            const transactions = [
                { userId: referrerId, reason: "referral", delta: 1 },
                { userId: referrerId, reason: "referral", delta: 3 },
                { userId: referrerId, reason: "daily_reward", delta: 2 },
                { userId: referrerId, reason: "purchase", delta: -6 },
                { userId: otherId, reason: "referral", delta: 3 },
            ];
            for (const [index, transaction] of transactions.entries()) {
                await ctx.db.insert("currencyTransactions", {
                    ...transaction,
                    idempotencyKey: `stats:${index}`,
                    createdAt: Date.now(),
                });
            }
        });

        expect(await asUser(t, "referrer").query(api.users.getReferralStats, {})).toEqual({
            referralCount: 3,
            referralCoins: 4,
        });
        expect(await asUser(t, "other").query(api.users.getReferralStats, {})).toEqual({
            referralCount: 0,
            referralCoins: 3,
        });
    });
});
