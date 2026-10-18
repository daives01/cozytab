import { describe, expect, test } from "bun:test";
import { api } from "@convex/_generated/api";
import { asUser, createConvexTest, seedCatalogItem, seedTemplate, seedUser } from "./convexTestUtils";

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
