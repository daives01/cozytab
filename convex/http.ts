import { httpRouter } from "convex/server";
import { components, internal } from "./_generated/api";
import { registerRoutes } from "@convex-dev/stripe";
import { buildCoinPacks, getCoinAmountForPriceId } from "@shared/coinPacks";
import type { Id } from "./_generated/dataModel";

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
    price150: requireEnv("STRIPE_PRICE_150_COINS", "150 coin pack"),
    price500: requireEnv("STRIPE_PRICE_500_COINS", "500 coin pack"),
});

const http = httpRouter();

registerRoutes(http, components.stripe, {
    webhookPath: "/stripe/webhook",
    events: {
        "checkout.session.completed": async (ctx, event) => {
            const session = event.data.object as { id?: string; metadata?: Record<string, string> };
            const metadata = session.metadata ?? {};
            const userId = typeof metadata.userId === "string" ? metadata.userId : null;
            const priceId = typeof metadata.priceId === "string" ? metadata.priceId : null;
            const coins = priceId ? getCoinAmountForPriceId(priceId, COIN_PRICE_TO_AMOUNT) : undefined;

            if (!userId || !priceId || coins === undefined) {
                return;
            }

            try {
                await ctx.runMutation(internal.stripe.fulfillCoinPurchase, {
                    userId: userId as Id<"users">,
                    coins,
                    priceId,
                    stripeEventId: event.id,
                    stripeSessionId: session.id,
                });
            } catch (error) {
                console.error("Failed to credit coins after Stripe checkout:", error);
                throw error;
            }
        },
    },
});

export default http;
