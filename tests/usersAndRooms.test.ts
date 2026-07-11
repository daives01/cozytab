import { describe, expect, test } from "bun:test";
import { api } from "@convex/_generated/api";
import { asUser, createConvexTest, seedCatalogItem, seedTemplate, seedUser } from "./convexTestUtils";

describe("users.ensureUser", () => {
    test("creates the first user with a balance, starter inventory, and active room", async () => {
        const t = createConvexTest();
        const templateId = await seedTemplate(t);
        const starterId = await seedCatalogItem(t, {
            name: "Starter Chair",
            basePrice: 3,
            isStarterItem: true,
        });

        const user = await asUser(t, "new-user").mutation(api.users.ensureUser, {
            username: "New User",
        });

        expect(user?.externalId).toBe("new-user");
        expect(user?.currency).toBe(5);
        expect(user?.onboardingCompleted).toBe(false);
        const state = await t.run(async (ctx) => ({
            inventory: await ctx.db.query("inventory").collect(),
            rooms: await ctx.db.query("rooms").collect(),
            transactions: await ctx.db.query("currencyTransactions").collect(),
        }));
        expect(state.inventory).toHaveLength(1);
        expect(state.inventory[0]).toMatchObject({ catalogItemId: starterId, count: 1 });
        expect(state.rooms).toHaveLength(1);
        expect(state.rooms[0]).toMatchObject({ templateId, isActive: true, items: [] });
        expect(state.transactions).toHaveLength(1);
        expect(state.transactions[0]).toMatchObject({ delta: 5, reason: "starting_balance" });
    });

    test("imports bounded guest inventory, items, shortcuts, and profile state", async () => {
        const t = createConvexTest();
        await seedTemplate(t);
        const starterId = await seedCatalogItem(t, {
            name: "Starter Chair",
            basePrice: 3,
            isStarterItem: true,
        });
        const paidId = await seedCatalogItem(t, { name: "Lamp", basePrice: 2 });
        const deletedId = await seedCatalogItem(t, { name: "Deleted", basePrice: 1 });
        await t.run((ctx) => ctx.db.delete(deletedId));

        const user = await asUser(t, "guest-import").mutation(api.users.ensureUser, {
            username: "Imported Guest",
            guestSession: {
                coins: 2,
                inventoryIds: [starterId, paidId, paidId, deletedId],
                roomItems: [
                    { id: "lamp", catalogItemId: paidId, x: -10, y: 12 },
                    { id: "gone", catalogItemId: deletedId, x: 2, y: 3 },
                ],
                shortcuts: [
                    { id: "a", name: "A", url: "https://a.example", row: 0, col: 0 },
                    { id: "b", name: "B", url: "https://b.example", row: 0, col: 0 },
                    { id: "c", name: "C", url: "https://c.example" },
                ],
                onboardingCompleted: true,
                cursorColor: "#123456",
            },
        });

        expect(user).toMatchObject({
            currency: 2,
            onboardingCompleted: true,
            cursorColor: "#123456",
        });
        expect(user?.computer?.shortcuts.map(({ row, col }) => [row, col])).toEqual([
            [0, 0],
            [0, 1],
            [0, 2],
        ]);

        const state = await t.run(async (ctx) => ({
            inventory: await ctx.db.query("inventory").collect(),
            room: await ctx.db.query("rooms").first(),
        }));
        expect(state.inventory).toHaveLength(2);
        expect(state.inventory.map((item) => [item.catalogItemId, item.count])).toEqual([
            [starterId, 1],
            [paidId, 1],
        ]);
        expect(state.room?.items).toEqual([
            { id: "lamp", catalogItemId: paidId, x: -10, y: 12 },
        ]);
    });
});

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
            })
        );
        const catalogItemId = await seedCatalogItem(t);
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
            })
        ).rejects.toThrow("Invalid catalog item");
        expect((await t.run((ctx) => ctx.db.get(roomId)))?.items).toEqual(saved?.items);
    });
});
