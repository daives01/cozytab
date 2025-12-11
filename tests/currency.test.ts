import { describe, expect, test } from "bun:test";
import { convexTest } from "convex-test";
import schema from "@convex/schema";
import { applyCurrencyChange } from "@convex/lib/currency";

const modules = {
    "@convex/_generated/api.js": () => import("@convex/_generated/api.js"),
    "@convex/_generated/server.js": () => import("@convex/_generated/server.js"),
};

async function setupUser(initialCurrency: number) {
    const t = convexTest(schema, modules);
    const userId = await t.run(async (ctx) =>
        ctx.db.insert("users", {
            externalId: "user",
            username: "user",
            currency: initialCurrency,
            referralCode: "REFCODE",
        })
    );
    const getUser = () => t.run((ctx) => ctx.db.get(userId));
    const getTxsByKey = (idempotencyKey: string) =>
        t.run((ctx) =>
            ctx.db
                .query("currencyTransactions")
                .withIndex("by_idempotencyKey", (q) => q.eq("idempotencyKey", idempotencyKey))
                .collect()
        );

    return { t, userId, getUser, getTxsByKey };
}

describe("applyCurrencyChange", () => {
    test("applies a debit and records transaction", async () => {
        const { t, userId, getUser, getTxsByKey } = await setupUser(5);

        const result = await t.run((ctx) =>
            applyCurrencyChange({
                ctx,
                userId,
                delta: -2,
                reason: "purchase",
                idempotencyKey: "purchase:user1:req1",
                metadata: { item: "chair" },
            })
        );

        const user = await getUser();
        const txs = await getTxsByKey("purchase:user1:req1");

        expect(result.applied).toBe(true);
        expect(result.balance).toBe(3);
        expect(user?.currency).toBe(3);
        expect(txs).toHaveLength(1);
        expect(txs[0].idempotencyKey).toBe("purchase:user1:req1");
    });

    test("applies a credit", async () => {
        const { t, userId, getUser, getTxsByKey } = await setupUser(1);

        const result = await t.run((ctx) =>
            applyCurrencyChange({
                ctx,
                userId,
                delta: 4,
                reason: "referral",
                idempotencyKey: "referral:user1:req1",
            })
        );

        const user = await getUser();
        const txs = await getTxsByKey("referral:user1:req1");

        expect(result.applied).toBe(true);
        expect(result.balance).toBe(5);
        expect(user?.currency).toBe(5);
        expect(txs).toHaveLength(1);
        expect(txs[0].idempotencyKey).toBe("referral:user1:req1");
    });

    test("is idempotent on repeated key", async () => {
        const { t, userId, getUser, getTxsByKey } = await setupUser(5);

        await t.run((ctx) =>
            applyCurrencyChange({
                ctx,
                userId,
                delta: -2,
                reason: "purchase",
                idempotencyKey: "purchase:user1:req1",
            })
        );
        const second = await t.run((ctx) =>
            applyCurrencyChange({
                ctx,
                userId,
                delta: -2,
                reason: "purchase",
                idempotencyKey: "purchase:user1:req1",
            })
        );

        const user = await getUser();
        const txs = await getTxsByKey("purchase:user1:req1");

        expect(second.applied).toBe(false);
        expect(user?.currency).toBe(3);
        expect(txs).toHaveLength(1);
    });

    test("rejects cross-user idempotency reuse", async () => {
        const t = convexTest(schema, modules);
        const { userA, userB } = await t.run(async (ctx) => {
            const a = await ctx.db.insert("users", {
                externalId: "userA",
                username: "userA",
                currency: 2,
                referralCode: "REF-A",
            });
            const b = await ctx.db.insert("users", {
                externalId: "userB",
                username: "userB",
                currency: 2,
                referralCode: "REF-B",
            });
            return { userA: a, userB: b };
        });

        await t.run((ctx) =>
            applyCurrencyChange({
                ctx,
                userId: userA,
                delta: -1,
                reason: "purchase",
                idempotencyKey: "shared-key",
            })
        );

        await expect(
            t.run((ctx) =>
                applyCurrencyChange({
                    ctx,
                    userId: userB,
                    delta: -1,
                    reason: "purchase",
                    idempotencyKey: "shared-key",
                })
            )
        ).rejects.toThrow("Idempotency key belongs to a different user");
    });

    test("rejects non-finite delta", async () => {
        const { t, userId } = await setupUser(5);

        await expect(
            t.run((ctx) =>
                applyCurrencyChange({
                    ctx,
                    userId,
                    // NaN intentionally for coverage
                    delta: Number.NaN,
                    reason: "purchase",
                    idempotencyKey: "purchase:user1:bad",
                })
            )
        ).rejects.toThrow("Currency delta must be a finite number");
    });

    test("rejects blank idempotency key", async () => {
        const { t, userId } = await setupUser(5);

        await expect(
            t.run((ctx) =>
                applyCurrencyChange({
                    ctx,
                    userId,
                    delta: 1,
                    reason: "purchase",
                    idempotencyKey: "   ",
                })
            )
        ).rejects.toThrow("Idempotency key is required");
    });

    test("rejects overspend", async () => {
        const { t, userId } = await setupUser(1);

        await expect(
            t.run((ctx) =>
                applyCurrencyChange({
                    ctx,
                    userId,
                    delta: -5,
                    reason: "purchase",
                    idempotencyKey: "purchase:user1:req2",
                })
            )
        ).rejects.toThrow("Insufficient funds");

        const user = await t.run((ctx) => ctx.db.get(userId));
        const txs = await t.run((ctx) => ctx.db.query("currencyTransactions").collect());

        expect(user?.currency).toBe(1);
        expect(txs).toHaveLength(0);
    });
});
