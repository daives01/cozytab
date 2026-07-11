import { describe, expect, test } from "bun:test";
import { api } from "@convex/_generated/api";
import { asUser, createConvexTest, seedCatalogItem, seedUser } from "./convexTestUtils";

describe("inventory purchases", () => {
    test("charges once per request, increments counts, and persists hidden state", async () => {
        const t = createConvexTest();
        const userId = await seedUser(t, "buyer", 10);
        const catalogItemId = await seedCatalogItem(t, { basePrice: 2 });
        const buyer = asUser(t, "buyer");

        expect(await buyer.mutation(api.inventory.purchaseItem, {
            catalogItemId,
            requestId: "request-1",
        })).toEqual({ success: true, newBalance: 8 });
        expect(await buyer.mutation(api.inventory.purchaseItem, {
            catalogItemId,
            requestId: "request-1",
        })).toEqual({ success: true, newBalance: 8 });
        expect(await buyer.mutation(api.inventory.purchaseItem, {
            catalogItemId,
            requestId: "request-2",
        })).toEqual({ success: true, newBalance: 6 });

        const inventory = (await t.run((ctx) => ctx.db.query("inventory").first()))!;
        expect(inventory).toMatchObject({ userId, catalogItemId, count: 2, hidden: false });
        expect((await t.run((ctx) => ctx.db.get(userId)))?.currency).toBe(6);
        expect(await t.run((ctx) => ctx.db.query("currencyTransactions").collect())).toHaveLength(2);

        await buyer.mutation(api.inventory.setHidden, {
            inventoryId: inventory._id,
            hidden: true,
        });
        expect((await buyer.query(api.inventory.getMyInventory, {}))[0]).toMatchObject({
            catalogItemId,
            count: 2,
            hidden: true,
        });
        expect(await buyer.query(api.inventory.hasItem, { catalogItemId })).toBe(true);
    });

    test("rejects unaffordable purchases without changing inventory or balance", async () => {
        const t = createConvexTest();
        const userId = await seedUser(t, "buyer", 1);
        const catalogItemId = await seedCatalogItem(t, { basePrice: 2 });

        expect(await asUser(t, "buyer").mutation(api.inventory.purchaseItem, {
            catalogItemId,
            requestId: "too-expensive",
        })).toEqual({ success: false, message: "Insufficient funds" });
        expect(await t.run((ctx) => ctx.db.query("inventory").collect())).toEqual([]);
        expect((await t.run((ctx) => ctx.db.get(userId)))?.currency).toBe(1);
    });
});
