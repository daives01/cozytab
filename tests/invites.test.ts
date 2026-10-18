import { describe, expect, test } from "bun:test";
import { api } from "@convex/_generated/api";
import { asUser, createConvexTest, seedRoom, seedTemplate, seedUser } from "./convexTestUtils";

describe("invite lifecycle", () => {
    test("enables one reusable invite and rotates its code", async () => {
        const t = createConvexTest();
        const userId = await seedUser(t, "owner");
        const templateId = await seedTemplate(t);
        const roomId = await seedRoom(t, userId, templateId);
        const owner = asUser(t, "owner");

        const first = await owner.mutation(api.invites.enableInvite, {});
        const enabled = await t.run((ctx) => ctx.db.get(first.inviteId));
        expect(first.code).toHaveLength(6);
        expect(enabled?.roomId).toBe(roomId);
        expect(enabled?.expiresAt).toBeGreaterThan(Date.now());

        const reenabled = await owner.mutation(api.invites.enableInvite, {});
        expect(reenabled.inviteId).toBe(first.inviteId);
        expect(reenabled.code).toBe(first.code);
        expect(await t.run((ctx) => ctx.db.query("roomInvites").collect())).toHaveLength(1);

        const rotated = await owner.mutation(api.invites.rotateInviteCode, {});
        expect(rotated.inviteId).toBe(first.inviteId);
        expect(rotated.code).not.toBe(first.code);
        expect(await t.query(api.invites.getInviteByToken, { token: first.code })).toBeNull();
        expect(await t.query(api.invites.getInviteByToken, { token: rotated.code })).not.toBeNull();
    });

    test("heartbeat extends access, close ends it, and lookups report closed or missing", async () => {
        const t = createConvexTest();
        const userId = await seedUser(t, "owner");
        const templateId = await seedTemplate(t);
        const roomId = await seedRoom(t, userId, templateId);
        const owner = asUser(t, "owner");
        const invite = await owner.mutation(api.invites.enableInvite, {});
        const before = await t.run((ctx) => ctx.db.get(invite.inviteId));

        const heartbeat = await owner.mutation(api.rooms.heartbeatInvite, {
            roomId,
            hasGuests: true,
        });
        const after = await t.run((ctx) => ctx.db.get(invite.inviteId));
        expect(heartbeat.closed).toBe(false);
        expect(after?.expiresAt).toBeGreaterThanOrEqual(before?.expiresAt ?? 0);
        expect(after?.hostOnlySince).toBeUndefined();

        const openLookup = await t.query(api.rooms.getRoomByInvite, { token: invite.code });
        expect(openLookup).toMatchObject({ closed: false, room: { _id: roomId } });
        expect(openLookup).toHaveProperty("ownerReferralCode", "REF-owner");

        const closed = await owner.mutation(api.rooms.closeInviteSession, { roomId });
        expect(closed.closed).toBe(true);
        expect(await t.query(api.rooms.getRoomByInvite, { token: invite.code })).toEqual({ closed: true });
        await t.run((ctx) => ctx.db.patch(invite.inviteId, { expiresAt: closed.expiresAt - 1 }));
        expect(await t.query(api.invites.getInviteByToken, { token: invite.code })).toBeNull();
    });

    test("expired invites remain resolvable as closed only through the room lookup", async () => {
        const t = createConvexTest();
        const userId = await seedUser(t, "owner");
        const templateId = await seedTemplate(t);
        await seedRoom(t, userId, templateId);
        const invite = await asUser(t, "owner").mutation(api.invites.enableInvite, {});
        await t.run((ctx) => ctx.db.patch(invite.inviteId, { expiresAt: Date.now() - 1 }));

        expect(await t.query(api.invites.getInviteByToken, { token: invite.code })).toBeNull();
        expect((await t.query(api.rooms.getRoomByInvite, { token: invite.code }))?.closed).toBe(true);
        expect((await t.query(api.rooms.getRoomStatus, {
            roomId: (await t.run((ctx) => ctx.db.get(invite.inviteId)))!.roomId,
        })).status).toBe("stale");
    });
});
