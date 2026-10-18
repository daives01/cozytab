import { describe, expect, test } from "bun:test";
import { api } from "@convex/_generated/api";
import { asUser, createConvexTest, seedTemplate, seedUser } from "./convexTestUtils";

describe("price validation", () => {
    test("catalog admin writes reject invalid prices", async () => {
        for (const basePrice of [-1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
            const t = createConvexTest();
            const adminId = await seedUser(t, "admin");
            await t.run((ctx) => ctx.db.patch(adminId, { admin: true }));
            await expect(asUser(t, "admin").mutation(api.catalog.addItem, {
                name: "Chair",
                category: "furniture",
                basePrice,
                assetUrl: "/chair.png",
                defaultWidth: 100,
            })).rejects.toThrow("Price must be a finite nonnegative integer");
            expect(await t.run((ctx) => ctx.db.query("catalogItems").collect())).toEqual([]);
        }
    });

    test("catalog updates and template writes reject invalid prices", async () => {
        for (const basePrice of [-1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
            const t = createConvexTest();
            const adminId = await seedUser(t, "admin");
            await t.run((ctx) => ctx.db.patch(adminId, { admin: true }));
            const catalogId = await t.run((ctx) => ctx.db.insert("catalogItems", {
                name: "Chair", category: "furniture", basePrice: 1, assetUrl: "/chair.png", defaultWidth: 100,
            }));
            const templateId = await seedTemplate(t);
            const admin = asUser(t, "admin");

            await expect(admin.mutation(api.catalog.updateItem, { id: catalogId, basePrice }))
                .rejects.toThrow("Price must be a finite nonnegative integer");
            await expect(admin.mutation(api.roomTemplates.addTemplate, {
                name: "Bad", basePrice, backgroundUrl: "/room.png", isDefault: false,
            })).rejects.toThrow("Price must be a finite nonnegative integer");
            await expect(admin.mutation(api.roomTemplates.updateTemplate, { id: templateId, basePrice }))
                .rejects.toThrow("Price must be a finite nonnegative integer");
            expect((await t.run((ctx) => ctx.db.get(catalogId)))?.basePrice).toBe(1);
            expect((await t.run((ctx) => ctx.db.get(templateId)))?.basePrice).toBe(0);
            expect(await t.run((ctx) => ctx.db.query("roomTemplates").collect())).toHaveLength(1);
        }
    });

    test("admin writes and purchases accept zero and positive integer prices", async () => {
        for (const basePrice of [0, 3]) {
            const t = createConvexTest();
            const userId = await seedUser(t, "admin", 10);
            await t.run((ctx) => ctx.db.patch(userId, { admin: true }));
            const admin = asUser(t, "admin");
            const item = await admin.mutation(api.catalog.addItem, {
                name: "Chair", category: "furniture", basePrice, assetUrl: "/chair.png", defaultWidth: 100,
            });
            const template = await admin.mutation(api.roomTemplates.addTemplate, {
                name: "Room", basePrice, backgroundUrl: "/room.png", isDefault: false,
            });
            expect(item.success).toBe(true);
            expect(template.success).toBe(true);
            const catalogItemId = item.id!;
            const templateId = template.id;
            await admin.mutation(api.catalog.updateItem, { id: catalogItemId, basePrice });
            await admin.mutation(api.roomTemplates.updateTemplate, { id: templateId, basePrice });
            // Partial updates may omit the price.
            await admin.mutation(api.catalog.updateItem, { id: catalogItemId, name: "Updated Chair" });
            await admin.mutation(api.roomTemplates.updateTemplate, { id: templateId, name: "Updated Room" });
            expect((await t.run((ctx) => ctx.db.get(catalogItemId)))?.basePrice).toBe(basePrice);
            expect((await t.run((ctx) => ctx.db.get(templateId)))?.basePrice).toBe(basePrice);
            expect(await admin.mutation(api.inventory.purchaseItem, { catalogItemId }))
                .toEqual({ success: true, newBalance: 10 - basePrice });
            const room = await admin.mutation(api.roomTemplates.purchaseRoom, { templateId });
            expect(room.success).toBe(true);
            expect(room.newBalance).toBe(10 - 2 * basePrice);
            expect(await t.run((ctx) => ctx.db.query("rooms").collect())).toHaveLength(1);
            expect(await t.run((ctx) => ctx.db.query("currencyTransactions").collect())).toHaveLength(2);
        }
    });

    test("template purchase rejects invalid stored prices and accepts free templates", async () => {
        for (const basePrice of [-1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
            const t = createConvexTest();
            const userId = await seedUser(t, "buyer", 10);
            const templateId = await t.run((ctx) => ctx.db.insert("roomTemplates", {
                name: "Bad", basePrice, backgroundUrl: "/room.png", isDefault: false,
            }));

            await expect(asUser(t, "buyer").mutation(api.roomTemplates.purchaseRoom, { templateId }))
                .rejects.toThrow("Price must be a finite nonnegative integer");
            expect((await t.run((ctx) => ctx.db.get(userId)))?.currency).toBe(10);
            expect(await t.run((ctx) => ctx.db.query("rooms").collect())).toEqual([]);
            expect(await t.run((ctx) => ctx.db.query("currencyTransactions").collect())).toEqual([]);
        }

        const t = createConvexTest();
        const userId = await seedUser(t, "buyer", 10);
        const templateId = await seedTemplate(t, "Free Room", false);
        const result = await asUser(t, "buyer").mutation(api.roomTemplates.purchaseRoom, { templateId });
        expect(result.success).toBe(true);
        expect((await t.run((ctx) => ctx.db.get(userId)))?.currency).toBe(10);
    });
});
