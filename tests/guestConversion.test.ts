import { describe, expect, test } from "bun:test";
import { api } from "@convex/_generated/api";
import { GUEST_STARTING_COINS, type GuestSessionState } from "@shared/guestTypes";
import { asUser, createConvexTest, seedCatalogItem, seedRoom, seedTemplate, seedUser } from "./convexTestUtils";

function guestProgress(overrides: Partial<GuestSessionState> = {}): GuestSessionState {
    return {
        coins: GUEST_STARTING_COINS,
        inventoryIds: [],
        roomItems: [],
        shortcuts: [],
        onboardingCompleted: false,
        cursorColor: "#ff3366",
        ...overrides,
    };
}

async function allConversionState(t: ReturnType<typeof createConvexTest>) {
    return t.run(async (ctx) => ({
        users: await ctx.db.query("users").collect(),
        inventory: await ctx.db.query("inventory").collect(),
        rooms: await ctx.db.query("rooms").collect(),
        transactions: await ctx.db.query("currencyTransactions").collect(),
        friendships: await ctx.db.query("friendships").collect(),
    }));
}

describe("Guest Conversion", () => {
    test("skips invalid stored prices when reconstructing paid inventory", async () => {
        for (const basePrice of [-1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
            const t = createConvexTest();
            await seedTemplate(t);
            const invalidId = await seedCatalogItem(t, { name: "Invalid", basePrice });
            const starterId = await seedCatalogItem(t, { name: "Starter", basePrice, isStarterItem: true });
            const paidId = await seedCatalogItem(t, { name: "Paid", basePrice: 2 });
            const freeId = await seedCatalogItem(t, { name: "Free", basePrice: 0 });

            await asUser(t, "buyer").mutation(api.guestConversion.resolveGuestProgress, {
                username: "Buyer",
                guestProgress: guestProgress({
                    inventoryIds: [invalidId, starterId, starterId, paidId, freeId],
                    roomItems: [{ id: "invalid", catalogItemId: invalidId, x: 0, y: 0 }],
                }),
            });

            const state = await allConversionState(t);
            expect(state.users[0]?.currency).toBe(GUEST_STARTING_COINS - 2);
            expect(state.transactions[0]?.delta).toBe(GUEST_STARTING_COINS - 2);
            expect(state.inventory.map(({ catalogItemId, count }) => [catalogItemId, count])).toEqual([
                [starterId, 1],
                [paidId, 1],
                [freeId, 1],
            ]);
            expect(state.rooms[0]?.items).toEqual([]);
        }
    });

    test("normalizes room links and drops invalid links without losing placements or music", async () => {
        const t = createConvexTest();
        await seedTemplate(t);
        const starterId = await seedCatalogItem(t, { isStarterItem: true });
        const urls = [" example.com/path ", "javascript:alert(1)", "https://", "https://example.com/\nfoo"];
        for (const [index, url] of urls.entries()) {
            await asUser(t, `url-guest-${index}`).mutation(api.guestConversion.resolveGuestProgress, {
                username: "Guest",
                guestProgress: guestProgress({
                    roomItems: [
                        {
                            id: "link",
                            catalogItemId: starterId,
                            x: 1,
                            y: 2,
                            url,
                            musicUrl: "https://youtu.be/abc",
                            musicType: "youtube",
                        },
                    ],
                }),
            });
        }
        const state = await allConversionState(t);
        expect(state.rooms).toHaveLength(urls.length);
        for (const [index, room] of state.rooms.entries()) {
            expect(room.items).toHaveLength(1);
            expect(room.items[0]).toMatchObject({ id: "link", musicUrl: "https://youtu.be/abc", musicType: "youtube" });
            expect(room.items[0].url).toBe(index === 0 ? "https://example.com/path" : undefined);
        }
    });

    test("preserves untouched Guest Progress as a new user's initial state", async () => {
        const t = createConvexTest();
        const templateId = await seedTemplate(t);
        const starterId = await seedCatalogItem(t, { name: "Starter Chair", basePrice: 3, isStarterItem: true });

        const result = await asUser(t, "new-user").mutation(api.guestConversion.resolveGuestProgress, {
            username: "New User",
            guestProgress: guestProgress(),
        });

        expect(result).toEqual({ disposition: "preserved" });
        const state = await allConversionState(t);
        expect(state.users[0]).toMatchObject({
            externalId: "new-user",
            username: "New User",
            currency: 5,
            onboardingCompleted: false,
            cursorColor: "#ff3366",
        });
        expect(state.inventory).toHaveLength(1);
        expect(state.inventory[0]).toMatchObject({ catalogItemId: starterId, count: 1 });
        expect(state.rooms).toHaveLength(1);
        expect(state.rooms[0]).toMatchObject({ templateId, isActive: true, items: [] });
        expect(state.transactions).toHaveLength(1);
        expect(state.transactions[0]).toMatchObject({ delta: 5, reason: "starting_balance" });
    });

    test("preserves valid customized room, economy, shortcuts, cursor, and onboarding state", async () => {
        const t = createConvexTest();
        await seedTemplate(t);
        const starterId = await seedCatalogItem(t, { name: "Starter Chair", basePrice: 3, isStarterItem: true });
        const lampId = await seedCatalogItem(t, { name: "Lamp", basePrice: 2 });

        const result = await asUser(t, "customized").mutation(api.guestConversion.resolveGuestProgress, {
            username: "Customized Guest",
            guestProgress: guestProgress({
                coins: 3,
                inventoryIds: [starterId, lampId],
                roomItems: [
                    { id: "starter", catalogItemId: starterId, x: 4, y: 8 },
                    { id: "lamp", catalogItemId: lampId, x: 12, y: 16, flipped: true },
                ],
                shortcuts: [
                    { id: "a", name: "A", url: "https://a.example", row: 0, col: 0 },
                    { id: "b", name: "B", url: "https://b.example", row: 0, col: 0 },
                    { id: "c", name: "C", url: "https://c.example" },
                ],
                onboardingCompleted: true,
                cursorColor: "#123456",
            }),
        });

        expect(result).toEqual({ disposition: "preserved" });
        const state = await allConversionState(t);
        expect(state.users[0]).toMatchObject({ currency: 3, onboardingCompleted: true, cursorColor: "#123456" });
        expect(state.users[0]?.computer?.shortcuts.map(({ row, col }) => [row, col])).toEqual([
            [0, 0],
            [0, 1],
            [0, 2],
        ]);
        expect(state.inventory.map(({ catalogItemId, count }) => [catalogItemId, count])).toEqual([
            [starterId, 1],
            [lampId, 1],
        ]);
        expect(state.rooms[0]?.items.map(({ id }) => id)).toEqual(["starter", "lamp"]);
    });

    test.each([50, 51, 100])("caps %i guest placements while preserving all inventory and coins", async (count) => {
        const t = createConvexTest();
        await seedTemplate(t);
        const freeId = await seedCatalogItem(t, { name: "Free decor", basePrice: 0 });
        const paidId = await seedCatalogItem(t, { name: "Purchased lamp", basePrice: 2 });
        const inventoryIds = [...Array.from({ length: count - 1 }, () => freeId), paidId];
        const roomItems = inventoryIds.map((catalogItemId, index) => ({
            id: `item-${index}`,
            catalogItemId,
            x: 1,
            y: 2,
        }));
        // Invalid placements must not consume capacity ahead of valid owned items.
        const invalid = { id: "unknown", catalogItemId: "unknown" as typeof freeId, x: 0, y: 0 };
        const caller = asUser(t, `guest-${count}`);
        await caller.mutation(api.guestConversion.resolveGuestProgress, {
            username: "Guest",
            guestProgress: guestProgress({ coins: 3, inventoryIds, roomItems: [invalid, ...roomItems] }),
        });

        const state = await allConversionState(t);
        expect(state.rooms[0].items).toEqual(roomItems.slice(0, 50));
        expect(state.inventory.map(({ catalogItemId, count }) => [catalogItemId, count])).toEqual([
            [freeId, count - 1],
            [paidId, 1],
        ]);
        expect(state.users[0].currency).toBe(3);
        expect(state.transactions[0].delta).toBe(3);
        // Converted rooms remain editable under the backend's placement limit.
        await caller.mutation(api.rooms.saveMyRoom, { roomId: state.rooms[0]._id, items: state.rooms[0].items });
    });

    test("reconstructs tampered economy within the fixed guest budget", async () => {
        const t = createConvexTest();
        await seedTemplate(t);
        const chairId = await seedCatalogItem(t, { name: "Chair", basePrice: 3 });
        const lampId = await seedCatalogItem(t, { name: "Lamp", basePrice: 2 });
        const rugId = await seedCatalogItem(t, { name: "Rug", basePrice: 2 });

        await asUser(t, "tampered").mutation(api.guestConversion.resolveGuestProgress, {
            username: "Tampered",
            guestProgress: guestProgress({
                coins: 999,
                inventoryIds: [chairId, lampId, rugId, chairId],
            }),
        });

        const state = await allConversionState(t);
        expect(state.users[0]?.currency).toBe(0);
        expect(state.inventory.map(({ catalogItemId, count }) => [catalogItemId, count])).toEqual([
            [chairId, 1],
            [lampId, 1],
        ]);
        expect(state.transactions).toHaveLength(1);
        expect(state.transactions[0]?.delta).toBe(0);
    });

    test("drops unknown and excess placements without exceeding owned quantities", async () => {
        const t = createConvexTest();
        await seedTemplate(t);
        const lampId = await seedCatalogItem(t, { name: "Lamp", basePrice: 2 });
        const deletedId = await seedCatalogItem(t, { name: "Deleted", basePrice: 1 });
        await t.run((ctx) => ctx.db.delete(deletedId));

        await asUser(t, "placements").mutation(api.guestConversion.resolveGuestProgress, {
            username: "Placements",
            guestProgress: guestProgress({
                inventoryIds: [lampId, lampId, deletedId],
                roomItems: [
                    { id: "lamp-1", catalogItemId: lampId, x: 1, y: 2 },
                    { id: "lamp-2", catalogItemId: lampId, x: 3, y: 4 },
                    { id: "lamp-excess", catalogItemId: lampId, x: 5, y: 6 },
                    { id: "deleted", catalogItemId: deletedId, x: 7, y: 8 },
                    { id: "invalid", catalogItemId: "not-a-convex-id", x: 9, y: 10 },
                ],
            }),
        });

        const state = await allConversionState(t);
        expect(state.inventory).toHaveLength(1);
        expect(state.inventory[0]).toMatchObject({ catalogItemId: lampId, count: 2 });
        expect(state.rooms[0]?.items.map(({ id }) => id)).toEqual(["lamp-1", "lamp-2"]);
    });

    test("applies valid referral reward and pending friendship exactly once", async () => {
        const t = createConvexTest();
        await seedTemplate(t);
        const referrerId = await seedUser(t, "referrer", 10);
        const caller = asUser(t, "referred");
        const args = {
            username: "Referred",
            referralCode: "REF-referrer",
            guestProgress: guestProgress(),
        };

        expect(await caller.mutation(api.guestConversion.resolveGuestProgress, args)).toEqual({
            disposition: "preserved",
        });
        expect(await caller.mutation(api.guestConversion.resolveGuestProgress, args)).toEqual({
            disposition: "discarded_existing_user",
        });

        const state = await allConversionState(t);
        const referrer = state.users.find(({ _id }) => _id === referrerId);
        const referred = state.users.find(({ externalId }) => externalId === "referred");
        expect(referrer?.currency).toBe(13);
        expect(referred?.referredBy).toBe(referrerId);
        expect(state.friendships).toHaveLength(1);
        expect(state.friendships[0]).toMatchObject({ status: "pending", initiator: referred?._id });
        expect(state.transactions.filter(({ reason }) => reason === "referral")).toHaveLength(1);
        expect(state.rooms.filter(({ userId }) => userId === referred?._id)).toHaveLength(1);
        expect(await asUser(t, "referrer").query(api.users.getReferralStats, {})).toEqual({
            referralCount: 1,
            referralCoins: 3,
        });
    });

    test("ignores invalid referral codes", async () => {
        const t = createConvexTest();
        await seedTemplate(t);

        expect(
            await asUser(t, "no-referrer").mutation(api.guestConversion.resolveGuestProgress, {
                username: "No Referrer",
                referralCode: "STALE",
                guestProgress: guestProgress(),
            }),
        ).toEqual({ disposition: "preserved" });

        const state = await allConversionState(t);
        expect(state.users[0]?.referredBy).toBeUndefined();
        expect(state.friendships).toHaveLength(0);
    });

    test("discards Guest Progress for an existing user without changing any state", async () => {
        const t = createConvexTest();
        const userId = await seedUser(t, "existing", 9);
        const templateId = await seedTemplate(t);
        await seedRoom(t, userId, templateId);
        const before = await allConversionState(t);

        const result = await asUser(t, "existing").mutation(api.guestConversion.resolveGuestProgress, {
            username: "Overwrite Attempt",
            referralCode: "STALE",
            guestProgress: guestProgress({ coins: 0, onboardingCompleted: true, cursorColor: "#000000" }),
        });

        expect(result).toEqual({ disposition: "discarded_existing_user" });
        expect(await allConversionState(t)).toEqual(before);
    });

    test("missing default template atomically leaves all conversion state uncommitted", async () => {
        const t = createConvexTest();
        await seedUser(t, "referrer", 10);

        await expect(
            asUser(t, "missing-template").mutation(api.guestConversion.resolveGuestProgress, {
                username: "Missing Template",
                referralCode: "REF-referrer",
                guestProgress: guestProgress(),
            }),
        ).rejects.toThrow("Default room template is not configured");

        const state = await allConversionState(t);
        expect(state.users).toHaveLength(1);
        expect(state.users[0]?.currency).toBe(10);
        expect(state.inventory).toHaveLength(0);
        expect(state.rooms).toHaveLength(0);
        expect(state.transactions).toHaveLength(0);
        expect(state.friendships).toHaveLength(0);
    });
});
