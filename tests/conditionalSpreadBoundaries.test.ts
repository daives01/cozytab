import { expect, test } from "bun:test";
import { convexTest } from "convex-test";
import schema from "@convex/schema";
import { internal } from "@convex/_generated/api";
import { applyPresenceMessage } from "@/presence/presenceState";
import type { PresenceVisitor } from "../shared/presenceProtocol";

const modules = {
    "@convex/_generated/api.js": () => import("@convex/_generated/api.js"),
    "@convex/_generated/server.js": () => import("@convex/_generated/server.js"),
    "@convex/stripe.ts": () => import("@convex/stripe"),
};

test("purchase ledger omits missing and empty session IDs and persists present IDs", async () => {
    const t = convexTest(schema, modules);
    const userId = await t.run((ctx) =>
        ctx.db.insert("users", {
            externalId: "buyer",
            username: "buyer",
            currency: 0,
            referralCode: "BUYER",
        }),
    );
    for (const [index, sessionId] of [undefined, "", "cs_present"].entries()) {
        const args: {
            userId: typeof userId;
            coins: number;
            priceId: string;
            stripeEventId: string;
            stripeSessionId?: string;
        } = {
            userId,
            coins: 10,
            priceId: "price_10",
            stripeEventId: `evt_${index}`,
        };
        if (sessionId !== undefined) args.stripeSessionId = sessionId;
        await t.mutation(internal.stripe.fulfillCoinPurchase, args);
    }
    const rows = await t.run((ctx) => ctx.db.query("currencyTransactions").collect());
    expect(rows).toHaveLength(3);
    for (const row of rows) {
        const present = row.idempotencyKey.endsWith("evt_2");
        expect(Object.hasOwn(row.metadata ?? {}, "stripeSessionId")).toBe(present);
        expect(JSON.parse(JSON.stringify(row.metadata)).stripeSessionId).toBe(present ? "cs_present" : undefined);
    }
    expect(await t.run(async (ctx) => (await ctx.db.get(userId))?.currency)).toBe(30);
});

test("presence retains coordinates across contexts and updates matching context without mutating inputs", () => {
    const visitor: PresenceVisitor = {
        visitorId: "visitor",
        displayName: "Guest",
        isOwner: false,
        x: 10,
        y: 20,
        chatMessage: null,
        inMenu: false,
        tabbedOut: false,
    };
    const other = { ...visitor, visitorId: "other" };
    const message = { type: "cursor" as const, visitorId: "visitor", x: 100, y: 200, inMenu: true };
    const different = applyPresenceMessage([visitor, other], message, { inMenu: false, inGame: null });
    expect([different[0].x, different[0].y]).toEqual([10, 20]);
    expect(different[0].inMenu).toBe(true);
    expect(different[1]).toBe(other);
    const same = applyPresenceMessage([visitor], message, { inMenu: true, inGame: null });
    expect([same[0].x, same[0].y]).toEqual([100, 200]);
    expect(same[0]).not.toBe(visitor);
    expect([visitor.x, visitor.y, visitor.inMenu]).toEqual([10, 20, false]);
});
