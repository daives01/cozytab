import { action, internalMutation } from "./_generated/server";
import { components, internal } from "./_generated/api";
import { StripeSubscriptions } from "@convex-dev/stripe";
import { v } from "convex/values";
import { applyCurrencyChange } from "./lib/currency";
import { buildCoinPacks, getCoinAmountForPriceId } from "@shared/coinPacks";

function requireEnv(key: string, label: string): string {
    const value = process.env[key];
    if (!value || !value.trim()) {
        throw new Error(`Missing required env ${key} for ${label}`);
    }
    return value.trim();
}

const { priceToAmount: COIN_PRICE_TO_AMOUNT } = buildCoinPacks({
    price10: requireEnv("STRIPE_PRICE_10_COINS", "10 coin pack"),
    price50: requireEnv("STRIPE_PRICE_50_COINS", "50 coin pack"),
    price1000: requireEnv("STRIPE_PRICE_1000_COINS", "1000 coin pack"),
});

const stripeClient = new StripeSubscriptions(components.stripe, {});

function getAppUrl(): string {
    const url = process.env.APP_URL;
    if (!url) {
        throw new Error("APP_URL environment variable is not set");
    }
    return url.replace(/\/+$/, "");
}

export const createCoinCheckout = action({
    args: {
        priceId: v.string(),
    },
    returns: v.object({
        sessionId: v.string(),
        url: v.union(v.string(), v.null()),
    }),
    handler: async (ctx, args): Promise<{ sessionId: string; url: string | null }> => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Not authenticated");
        const user = await ctx.runQuery(internal.users.getByExternalId, {
            externalId: identity.subject,
        });
        if (!user) {
            throw new Error("Authenticated user record not found");
        }
        const coinAmount = getCoinAmountForPriceId(args.priceId, COIN_PRICE_TO_AMOUNT);
        if (coinAmount === undefined) {
            throw new Error("Unsupported coin pack");
        }

        const customerResult = await stripeClient.getOrCreateCustomer(ctx, {
            userId: identity.subject,
            email: identity.email,
            name: identity.name,
        });

        return await stripeClient.createCheckoutSession(ctx, {
            priceId: args.priceId,
            customerId: customerResult.customerId,
            mode: "payment",
            successUrl: `${getAppUrl()}/?success=stripe`,
            cancelUrl: `${getAppUrl()}/?canceled=stripe`,
            metadata: {
                userId: user._id,
                priceId: args.priceId,
                coins: String(coinAmount),
                purchaseType: "coins",
            },
            paymentIntentMetadata: {
                userId: user._id,
            },
        });
    },
});

export const fulfillCoinPurchase = internalMutation({
    args: {
        userId: v.id("users"),
        coins: v.number(),
        priceId: v.string(),
        stripeEventId: v.string(),
        stripeSessionId: v.optional(v.string()),
    },
    handler: async (ctx, args): Promise<void> => {
        const idempotencyKey = `stripe:checkout:${args.stripeEventId}`;
        await applyCurrencyChange({
            ctx,
            userId: args.userId,
            delta: args.coins,
            reason: "purchase",
            idempotencyKey,
            metadata: {
                stripeEventId: args.stripeEventId,
                stripeSessionId: args.stripeSessionId,
                priceId: args.priceId,
                coins: args.coins,
            },
        });
    },
});
