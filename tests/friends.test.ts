import { describe, expect, test } from "bun:test";
import { api } from "@convex/_generated/api";
import { asUser, createConvexTest, seedUser } from "./convexTestUtils";

describe("friendship lifecycle", () => {
    test("creates a request and auto-accepts a reciprocal request", async () => {
        const t = createConvexTest();
        const aliceId = await seedUser(t, "alice");
        const bobId = await seedUser(t, "bob");

        expect(await asUser(t, "alice").mutation(api.friends.sendFriendRequestByUserId, {
            userId: bobId,
        })).toEqual({ success: true });
        let friendships = await t.run((ctx) => ctx.db.query("friendships").collect());
        expect(friendships).toHaveLength(1);
        expect(friendships[0]).toMatchObject({ status: "pending", initiator: aliceId });

        expect(await asUser(t, "bob").mutation(api.friends.sendFriendRequestByUserId, {
            userId: aliceId,
        })).toEqual({ success: true, autoAccepted: true });
        friendships = await t.run((ctx) => ctx.db.query("friendships").collect());
        expect(friendships).toHaveLength(1);
        expect(friendships[0].status).toBe("accepted");
        expect(friendships[0].acceptedAt).toBeNumber();
    });

    test("accepts and removes a friendship", async () => {
        const t = createConvexTest();
        await seedUser(t, "alice");
        const bobId = await seedUser(t, "bob");
        await asUser(t, "alice").mutation(api.friends.sendFriendRequestByUserId, { userId: bobId });
        const friendship = (await t.run((ctx) => ctx.db.query("friendships").first()))!;

        await asUser(t, "bob").mutation(api.friends.acceptFriendRequest, {
            friendshipId: friendship._id,
        });
        expect((await t.run((ctx) => ctx.db.get(friendship._id)))?.status).toBe("accepted");

        await asUser(t, "alice").mutation(api.friends.removeFriend, {
            friendshipId: friendship._id,
        });
        expect(await t.run((ctx) => ctx.db.get(friendship._id))).toBeNull();
    });

    test("declines an incoming request", async () => {
        const t = createConvexTest();
        await seedUser(t, "alice");
        const bobId = await seedUser(t, "bob");
        await asUser(t, "alice").mutation(api.friends.sendFriendRequestByUserId, { userId: bobId });
        const friendship = (await t.run((ctx) => ctx.db.query("friendships").first()))!;

        await asUser(t, "bob").mutation(api.friends.declineFriendRequest, {
            friendshipId: friendship._id,
        });
        expect(await t.run((ctx) => ctx.db.get(friendship._id))).toBeNull();
    });

    test("cancels an outgoing request", async () => {
        const t = createConvexTest();
        await seedUser(t, "alice");
        const bobId = await seedUser(t, "bob");
        await asUser(t, "alice").mutation(api.friends.sendFriendRequestByUserId, { userId: bobId });
        const friendship = (await t.run((ctx) => ctx.db.query("friendships").first()))!;

        await asUser(t, "alice").mutation(api.friends.cancelFriendRequest, {
            friendshipId: friendship._id,
        });
        expect(await t.run((ctx) => ctx.db.get(friendship._id))).toBeNull();
    });
});
