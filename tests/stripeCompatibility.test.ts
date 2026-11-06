import { afterEach, expect, spyOn, test } from "bun:test";
import { convexTest } from "convex-test";
import Stripe from "stripe";
import { StripeSubscriptions } from "@convex-dev/stripe";
import schema from "@convex/schema";
import { api, components } from "@convex/_generated/api";
import componentSchema from "../node_modules/@convex-dev/stripe/src/component/schema";
import { stubGlobal } from "./stubGlobal";
import { seedUser } from "./convexTestUtils";

const modules = {
    "convex/_generated/api.js": () => import("@convex/_generated/api"),
    "convex/_generated/server.js": () => import("@convex/_generated/server"),
    "convex/users.ts": () => import("@convex/users"),
    "convex/stripe.ts": () => import("@convex/stripe"),
    "convex/http.ts": () => import("@convex/http"),
};

const componentModules = {
    "stripe/_generated/api.js": () => import("../node_modules/@convex-dev/stripe/src/component/_generated/api"),
    "stripe/_generated/server.js": () => import("../node_modules/@convex-dev/stripe/src/component/_generated/server"),
    "stripe/public.ts": () => import("../node_modules/@convex-dev/stripe/src/component/public"),
    "stripe/private.ts": () => import("../node_modules/@convex-dev/stripe/src/component/private"),
};

const envKeys = [
    "STRIPE_PRICE_10_COINS",
    "STRIPE_PRICE_50_COINS",
    "STRIPE_PRICE_150_COINS",
    "STRIPE_PRICE_500_COINS",
    "APP_URL",
    "STRIPE_SECRET_KEY",
    "STRIPE_WEBHOOK_SECRET",
] as const;

const originalEnv = envKeys.map((key) => process.env[key]);

afterEach(() => {
    envKeys.forEach((key, index) => {
        if (originalEnv[index] === undefined) delete process.env[key];
        else process.env[key] = originalEnv[index];
    });
});

function setup() {
    envKeys.slice(0, 4).forEach((key, index) => {
        process.env[key] = `price_${index}`;
    });
    process.env.APP_URL = "https://cozy.test/";
    process.env.STRIPE_SECRET_KEY = "sk_test_fake";
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_fake";
    const t = convexTest(schema, modules);
    t.registerComponent("stripe", componentSchema, componentModules);

    return t;
}

test("checkout binds authenticated customer and database user metadata and rejects unsupported packs", async () => {
    const t = setup();
    const userId = await seedUser(t, "subject");

    const customer = spyOn(StripeSubscriptions.prototype, "getOrCreateCustomer").mockResolvedValue({
        customerId: "cus_fake",
        isNew: false,
    });

    const checkout = spyOn(StripeSubscriptions.prototype, "createCheckoutSession").mockResolvedValue({
        sessionId: "cs_fake",
        url: "https://checkout.test",
    });

    try {
        await expect(t.action(api.stripe.createCoinCheckout, { priceId: "price_0" })).rejects.toThrow(
            "Not authenticated",
        );
        const buyer = t.withIdentity({ subject: "subject", email: "buyer@test.com", name: "Buyer" });
        await expect(buyer.action(api.stripe.createCoinCheckout, { priceId: "unknown" })).rejects.toThrow(
            "Unsupported coin pack",
        );
        expect(customer).not.toHaveBeenCalled();
        expect(await buyer.action(api.stripe.createCoinCheckout, { priceId: "price_0" })).toEqual({
            sessionId: "cs_fake",
            url: "https://checkout.test",
        });
        expect(customer.mock.calls[0]?.[1]).toEqual({ userId: "subject", email: "buyer@test.com", name: "Buyer" });
        expect(checkout.mock.calls[0]?.[1]).toEqual({
            priceId: "price_0",
            customerId: "cus_fake",
            mode: "payment",
            successUrl: "https://cozy.test/?success=stripe",
            cancelUrl: "https://cozy.test/?canceled=stripe",
            metadata: { userId, priceId: "price_0", coins: "10", purchaseType: "coins" },
            paymentIntentMetadata: { userId },
        });
        delete process.env.STRIPE_PRICE_10_COINS;
        await expect(buyer.action(api.stripe.createCoinCheckout, { priceId: "price_0" })).rejects.toThrow(
            "Missing required env",
        );
        expect(checkout).toHaveBeenCalledTimes(1);
    } finally {
        customer.mockRestore();
        checkout.mockRestore();
    }
});

test("upgraded SDK reuses component customer and preserves checkout request optional fields", async () => {
    const t = setup();
    await t.mutation(components.stripe.public.createOrUpdateCustomer, {
        stripeCustomerId: "cus_existing",
        metadata: { userId: "subject" },
    });
    const client = new StripeSubscriptions(components.stripe, { STRIPE_SECRET_KEY: "sk_test_fake" });
    const requests: URLSearchParams[] = [];

    const restoreFetch = stubGlobal(
        "fetch",
        Object.assign(
            async (_input: RequestInfo | URL, init?: RequestInit) => {
                requests.push(new URLSearchParams(String(init?.body)));

                return new Response(JSON.stringify({ id: "cs_fake", url: null }), {
                    headers: { "content-type": "application/json" },
                });
            },
            { preconnect: fetch.preconnect },
        ),
    );

    try {
        expect(await t.action((ctx) => client.getOrCreateCustomer(ctx, { userId: "subject" }))).toEqual({
            customerId: "cus_existing",
            isNew: false,
        });
        expect(requests).toHaveLength(0);
        expect(
            await t.action((ctx) =>
                client.createCheckoutSession(ctx, {
                    priceId: "price_0",
                    mode: "payment",
                    successUrl: "https://cozy.test/ok",
                    cancelUrl: "https://cozy.test/cancel",
                    paymentIntentMetadata: { userId: "subject" },
                }),
            ),
        ).toEqual({ sessionId: "cs_fake", url: null });
        expect(Object.fromEntries(requests[0] ?? [])).toEqual({
            mode: "payment",
            "line_items[0][price]": "price_0",
            "line_items[0][quantity]": "1",
            success_url: "https://cozy.test/ok",
            cancel_url: "https://cozy.test/cancel",
            "payment_intent_data[metadata][userId]": "subject",
        });
        expect(requests[0]?.has("customer")).toBe(false);
    } finally {
        restoreFetch();
    }
});

test("signed checkout webhook validates metadata and credits repeated event once", async () => {
    const t = setup();
    const userId = await seedUser(t, "subject", 0);

    async function send(metadata: Record<string, string>, eventId = "evt_fake", validSignature = true) {
        const payload = JSON.stringify({
            id: eventId,
            type: "checkout.session.completed",
            data: { object: { id: "cs_fake", mode: "payment", metadata } },
        });

        const signature = await Stripe.webhooks.generateTestHeaderStringAsync({
            payload,
            secret: validSignature ? "whsec_fake" : "wrong",
        });

        return t.fetch("/stripe/webhook", {
            method: "POST",
            headers: { "stripe-signature": signature },
            body: payload,
        });
    }

    expect((await send({ userId, priceId: "price_0" }, "evt_fake", false)).status).toBe(400);
    expect((await send({ priceId: "price_0" })).status).toBe(500);
    expect((await send({ userId: "not-a-convex-id", priceId: "price_0" })).status).toBe(500);
    expect((await send({ userId, priceId: "unknown" })).status).toBe(500);
    expect((await send({ userId, priceId: "price_0", coins: "9999" })).status).toBe(200);
    expect((await send({ userId, priceId: "price_0" })).status).toBe(200);
    expect(await t.run(async (ctx) => (await ctx.db.get(userId))?.currency)).toBe(10);
    expect(await t.run((ctx) => ctx.db.query("currencyTransactions").collect())).toHaveLength(1);
    delete process.env.STRIPE_PRICE_10_COINS;
    expect((await send({ userId, priceId: "price_0" }, "evt_missing_config")).status).toBe(500);
    expect(await t.run(async (ctx) => (await ctx.db.get(userId))?.currency)).toBe(10);
});
