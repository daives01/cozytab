import { getCoinPriceToAmount } from "./lib/coinPackConfig";
import { httpRouter } from "convex/server";
import { components, internal } from "./_generated/api";
import { registerRoutes } from "@convex-dev/stripe";
import { getCoinAmountForPriceId } from "@shared/coinPacks";
import type { Id } from "./_generated/dataModel";

const http = httpRouter();

registerRoutes(http, components.stripe, {
    webhookPath: "/stripe/webhook",
    events: {
        "checkout.session.completed": async (ctx, event) => {
            const session = event.data.object;
            const metadata = session.metadata ?? {};
            const userId = typeof metadata.userId === "string" ? metadata.userId : null;
            const priceId = typeof metadata.priceId === "string" ? metadata.priceId : null;
            const coins = priceId ? getCoinAmountForPriceId(priceId, getCoinPriceToAmount()) : undefined;

            if (!userId) {
                throw new Error(`Missing userId in checkout.session.completed metadata for session ${session.id}`);
            }

            if (!priceId) {
                throw new Error(`Missing priceId in checkout.session.completed metadata for session ${session.id}`);
            }

            if (coins === undefined) {
                throw new Error(
                    `Invalid priceId ${priceId} in checkout.session.completed for session ${session.id} - not a configured coin pack`,
                );
            }

            try {
                await ctx.runMutation(internal.stripe.fulfillCoinPurchase, {
                    // SAFETY: checkout metadata is written from user._id in createCoinCheckout;
                    // fulfillCoinPurchase validates this value with v.id("users") before its handler runs.
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
