import type { MutationCtx } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";

export type CurrencyReason =
    | "starting_balance"
    | "daily_reward"
    | "referral"
    | "purchase"
    | "room_purchase"
    | "guest_import"
    | "admin_adjustment"
    | "gift";

type ApplyCurrencyChangeArgs = {
    ctx: MutationCtx;
    userId: Id<"users">;
    delta: number;
    reason: CurrencyReason | (string & {});
    idempotencyKey: string;
    metadata?: Record<string, unknown>;
};

type ApplyCurrencyChangeResult = {
    applied: boolean;
    balance: number;
    transaction: Doc<"currencyTransactions">;
};

export async function applyCurrencyChange({
    ctx,
    userId,
    delta,
    reason,
    idempotencyKey,
    metadata,
}: ApplyCurrencyChangeArgs): Promise<ApplyCurrencyChangeResult> {
    if (!Number.isFinite(delta)) {
        throw new Error("Currency delta must be a finite number");
    }
    const trimmedKey = idempotencyKey.trim();
    if (trimmedKey.length === 0) {
        throw new Error("Idempotency key is required");
    }

    const existingTx = await ctx.db
        .query("currencyTransactions")
        .withIndex("by_idempotencyKey", (q) => q.eq("idempotencyKey", trimmedKey))
        .unique();
    if (existingTx) {
        if (existingTx.userId !== userId) {
            throw new Error("Idempotency key belongs to a different user");
        }
        const existingUser = await ctx.db.get(existingTx.userId);
        if (!existingUser) {
            throw new Error("User not found for existing transaction");
        }
        return { applied: false, balance: existingUser.currency, transaction: existingTx };
    }

    const user = await ctx.db.get(userId);
    if (!user) {
        throw new Error("User not found");
    }

    const nextBalance = user.currency + delta;
    if (nextBalance < 0) {
        throw new Error("Insufficient funds");
    }

    const now = Date.now();
    const transactionId = await ctx.db.insert("currencyTransactions", {
        userId,
        delta,
        reason,
        idempotencyKey: trimmedKey,
        createdAt: now,
        metadata,
    });

    await ctx.db.patch(user._id, { currency: nextBalance });

    return {
        applied: true,
        balance: nextBalance,
        transaction: {
            _id: transactionId,
            _creationTime: now,
            userId,
            delta,
            reason,
            idempotencyKey: trimmedKey,
            createdAt: now,
            metadata,
        },
    };
}
