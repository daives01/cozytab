import { describe, expect, test } from "bun:test";
import { api } from "@convex/_generated/api";
import { asUser, createConvexTest, seedCatalogItem, seedTemplate, seedUser, seedRoom } from "./convexTestUtils";

describe("room active-state and saving invariants", () => {
    test("keeps exactly one room active through create, switch, and delete", async () => {
        const t = createConvexTest();
        await seedUser(t, "owner");
        const firstTemplate = await seedTemplate(t, "First");
        const secondTemplate = await seedTemplate(t, "Second", false);
        const owner = asUser(t, "owner");

        const firstRoom = await owner.mutation(api.rooms.createRoom, { templateId: firstTemplate });
        const secondRoom = await owner.mutation(api.rooms.createRoom, { templateId: secondTemplate });
        let rooms = await t.run((ctx) => ctx.db.query("rooms").collect());
        expect(rooms.filter((room) => room.isActive).map((room) => room._id)).toEqual([firstRoom]);

        await owner.mutation(api.rooms.setActiveRoom, { roomId: secondRoom });
        rooms = await t.run((ctx) => ctx.db.query("rooms").collect());
        expect(rooms.filter((room) => room.isActive).map((room) => room._id)).toEqual([secondRoom]);

        await owner.mutation(api.rooms.deleteRoom, { roomId: secondRoom });
        rooms = await t.run((ctx) => ctx.db.query("rooms").collect());
        expect(rooms).toHaveLength(1);
        expect(rooms[0]).toMatchObject({ _id: firstRoom, isActive: true });

        const lastDelete = await owner.mutation(api.rooms.deleteRoom, { roomId: firstRoom });
        expect(lastDelete).toEqual({ success: false, message: "Cannot delete your last room" });
    });

    test("enforces the 50-item cap together with inventory ownership", async () => {
        const t = createConvexTest();
        const userId = await seedUser(t, "owner");
        const templateId = await seedTemplate(t);
        const roomId = await seedRoom(t, userId, templateId);
        const catalogItemId = await seedCatalogItem(t);
        await t.run((ctx) =>
            ctx.db.insert("inventory", {
                userId,
                catalogItemId,
                purchasedAt: Date.now(),
                count: 51,
            }),
        );
        const items = Array.from({ length: 51 }, (_, index) => ({ id: `item-${index}`, catalogItemId, x: 1, y: 2 }));
        const owner = asUser(t, "owner");
        await owner.mutation(api.rooms.saveMyRoom, { roomId, items: items.slice(0, 50) });
        const saved = await t.run((ctx) => ctx.db.get(roomId));
        expect(saved?.items).toHaveLength(50);
        await expect(owner.mutation(api.rooms.saveMyRoom, { roomId, items })).rejects.toThrow("Room full (50 items)");
        expect((await t.run((ctx) => ctx.db.get(roomId)))?.items).toEqual(saved?.items);
    });

    test("saves valid items while clamping coordinates and rejecting unknown catalog IDs", async () => {
        const t = createConvexTest();
        const userId = await seedUser(t, "owner");
        const templateId = await seedTemplate(t);

        const roomId = await t.run((ctx) =>
            ctx.db.insert("rooms", {
                userId,
                templateId,
                name: "Room",
                isActive: true,
                items: [],
            }),
        );

        const catalogItemId = await seedCatalogItem(t);
        await t.run((ctx) =>
            ctx.db.insert("inventory", {
                userId,
                catalogItemId,
                purchasedAt: Date.now(),
                count: 1,
            }),
        );
        const deletedCatalogId = await seedCatalogItem(t, { name: "Deleted" });
        await t.run((ctx) => ctx.db.delete(deletedCatalogId));
        const owner = asUser(t, "owner");

        await owner.mutation(api.rooms.saveMyRoom, {
            roomId,
            items: [
                {
                    id: "chair",
                    catalogItemId,
                    x: -100,
                    y: 9999,
                    musicStartedAt: -5,
                    musicPositionAtStart: -10,
                },
            ],
        });
        const saved = await t.run((ctx) => ctx.db.get(roomId));
        expect(saved?.items[0]).toMatchObject({
            x: 0,
            y: 1400,
            musicStartedAt: 0,
            musicPositionAtStart: 0,
        });

        await expect(
            owner.mutation(api.rooms.saveMyRoom, {
                roomId,
                items: [{ id: "gone", catalogItemId: deletedCatalogId, x: 1, y: 1 }],
            }),
        ).rejects.toThrow("Invalid catalog item");
        expect((await t.run((ctx) => ctx.db.get(roomId)))?.items).toEqual(saved?.items);
    });

    test("rejects unpaid placements and placements beyond owned quantity", async () => {
        const t = createConvexTest();
        const userId = await seedUser(t, "owner");
        const templateId = await seedTemplate(t);

        const roomId = await t.run((ctx) =>
            ctx.db.insert("rooms", {
                userId,
                templateId,
                name: "Room",
                isActive: true,
                items: [],
            }),
        );

        const paidItemId = await seedCatalogItem(t, { name: "Paid item" });
        const unpaidItemId = await seedCatalogItem(t, { name: "Unpaid item" });
        const otherUserId = await seedUser(t, "other");
        await t.run((ctx) =>
            ctx.db.insert("inventory", {
                userId: otherUserId,
                catalogItemId: unpaidItemId,
                purchasedAt: Date.now(),
                count: 10,
            }),
        );
        await t.run((ctx) =>
            ctx.db.insert("inventory", {
                userId,
                catalogItemId: paidItemId,
                purchasedAt: Date.now(),
                count: 1,
            }),
        );
        const owner = asUser(t, "owner");

        await expect(
            owner.mutation(api.rooms.saveMyRoom, {
                roomId,
                items: [{ id: "unpaid", catalogItemId: unpaidItemId, x: 1, y: 1 }],
            }),
        ).rejects.toThrow("Room contains items you do not own");

        await expect(
            owner.mutation(api.rooms.saveMyRoom, {
                roomId,
                items: [
                    { id: "paid-1", catalogItemId: paidItemId, x: 1, y: 1 },
                    { id: "paid-1", catalogItemId: paidItemId, x: 2, y: 2 },
                ],
            }),
        ).rejects.toThrow("Room contains items you do not own");
        expect((await t.run((ctx) => ctx.db.get(roomId)))?.items).toEqual([]);
    });

    test("allows implicit single starter ownership and legacy inventory counts", async () => {
        const t = createConvexTest();
        const userId = await seedUser(t, "owner");
        const templateId = await seedTemplate(t);

        const roomId = await t.run((ctx) =>
            ctx.db.insert("rooms", {
                userId,
                templateId,
                name: "Room",
                isActive: true,
                items: [],
            }),
        );

        const starterItemId = await seedCatalogItem(t, { name: "Starter item", isStarterItem: true });
        const legacyItemId = await seedCatalogItem(t, { name: "Legacy item" });
        await t.run((ctx) =>
            ctx.db.insert("inventory", {
                userId,
                catalogItemId: legacyItemId,
                purchasedAt: Date.now(),
            }),
        );

        await asUser(t, "owner").mutation(api.rooms.saveMyRoom, {
            roomId,
            items: [
                { id: "starter", catalogItemId: starterItemId, x: 1, y: 1 },
                { id: "legacy", catalogItemId: legacyItemId, x: 2, y: 2 },
            ],
        });
        const saved = (await t.run((ctx) => ctx.db.get(roomId)))?.items;
        expect(saved).toHaveLength(2);

        for (const catalogItemId of [starterItemId, legacyItemId]) {
            await expect(
                asUser(t, "owner").mutation(api.rooms.saveMyRoom, {
                    roomId,
                    items: [
                        { id: "one", catalogItemId, x: 0, y: 0 },
                        { id: "two", catalogItemId, x: 1, y: 1 },
                    ],
                }),
            ).rejects.toThrow("Room contains items you do not own");
            expect((await t.run((ctx) => ctx.db.get(roomId)))?.items).toEqual(saved);
        }
    });

    test("uses explicit quantities, includes hidden ownership, and sums inventory rows", async () => {
        const t = createConvexTest();
        const userId = await seedUser(t, "owner");
        const templateId = await seedTemplate(t);
        const roomId = await seedRoom(t, userId, templateId);
        const paidItemId = await seedCatalogItem(t);
        const starterItemId = await seedCatalogItem(t, { isStarterItem: true });
        const zeroItemId = await seedCatalogItem(t, { name: "Zero count" });
        await t.run(async (ctx) => {
            for (const [catalogItemId, count] of [
                [paidItemId, 2],
                [paidItemId, 1],
                [starterItemId, 2],
                [zeroItemId, 0],
            ] as const) {
                await ctx.db.insert("inventory", {
                    userId,
                    catalogItemId,
                    purchasedAt: Date.now(),
                    count,
                    hidden: true,
                });
            }
        });
        const owner = asUser(t, "owner");

        const items = [paidItemId, paidItemId, paidItemId, starterItemId, starterItemId].map((catalogItemId, i) => ({
            id: String(i),
            catalogItemId,
            x: i,
            y: i,
        }));

        expect(await owner.mutation(api.rooms.saveMyRoom, { roomId, items })).toEqual(items);

        for (const catalogItemId of [paidItemId, starterItemId, zeroItemId]) {
            await expect(
                owner.mutation(api.rooms.saveMyRoom, {
                    roomId,
                    items: [...items, { id: "extra", catalogItemId, x: 0, y: 0 }],
                }),
            ).rejects.toThrow("Room contains items you do not own");
            expect((await t.run((ctx) => ctx.db.get(roomId)))?.items).toEqual(items);
        }

        expect(await owner.mutation(api.rooms.saveMyRoom, { roomId, items: [] })).toEqual([]);
    });

    test("normalizes room item links and rejects malformed or disallowed schemes", async () => {
        const t = createConvexTest();
        const userId = await seedUser(t, "url-owner");
        const templateId = await seedTemplate(t);

        const roomId = await t.run((ctx) =>
            ctx.db.insert("rooms", {
                userId,
                templateId,
                name: "Room",
                isActive: true,
                items: [],
            }),
        );

        const catalogItemId = await seedCatalogItem(t, { isStarterItem: true });
        const owner = asUser(t, "url-owner");

        await owner.mutation(api.rooms.saveMyRoom, {
            roomId,
            items: [
                {
                    id: "link",
                    catalogItemId,
                    x: 1,
                    y: 1,
                    url: " example.com/path ",
                    musicUrl: "https://youtu.be/abc?t=20",
                    musicType: "youtube",
                },
            ],
        });
        const saved = await t.run((ctx) => ctx.db.get(roomId));
        expect(saved?.items[0]).toMatchObject({
            url: "https://example.com/path",
            musicUrl: "https://youtu.be/abc?t=20",
            musicType: "youtube",
        });

        for (const url of [
            "javascript:alert(1)",
            "data:text/html,hi",
            "file:///etc/passwd",
            "https://",
            "https://exa mple.com",
            "https://example.com/\nfoo",
            `https://example.com/${"é".repeat(400)}`,
        ]) {
            await expect(
                owner.mutation(api.rooms.saveMyRoom, {
                    roomId,
                    items: [{ id: "bad-link", catalogItemId, x: 1, y: 1, url }],
                }),
            ).rejects.toThrow("Invalid room item URL");
            expect((await t.run((ctx) => ctx.db.get(roomId)))?.items).toEqual(saved?.items);
        }
    });
});
