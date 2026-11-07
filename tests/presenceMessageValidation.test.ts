import { expect, test } from "bun:test";
import { isPresenceMessage } from "../shared/validatePresenceMessage";

test("presence wire boundary rejects malformed data and preserves optional cursor semantics", () => {
    for (const value of [
        null,
        [],
        {},
        { type: "chat", visitorId: "v", text: 3 },
        { type: "state", visitors: [null] },
        { type: "cursor", visitorId: "v", x: Infinity, y: 0 },
        { type: "cursor", visitorId: "v", x: 0, y: 0, gameMetadata: [] },
    ]) {
        expect(isPresenceMessage(value)).toBe(false);
    }

    for (const value of [
        { type: "leave", visitorId: "v" },
        { type: "chat", visitorId: "v", text: null },
        { type: "cursor", visitorId: "v", x: 0, y: 0 },
        { type: "cursor", visitorId: "v", x: 0, y: 0, inMenu: false, inGame: null, gameMetadata: null },
        { type: "join", visitorId: "v", displayName: "Guest", isOwner: false },
        { type: "rename", visitorId: "v", displayName: "" },
        { type: "state", visitors: [] },
    ]) {
        expect(isPresenceMessage(value)).toBe(true);
    }
});

test("presence snapshots accept worker visitors and reject malformed visitor contracts", () => {
    const visitor = {
        visitorId: "guest",
        displayName: "Guest",
        isOwner: false,
        x: 960,
        y: 540,
        chatMessage: null,
        inMenu: false,
        tabbedOut: false,
    };

    expect(isPresenceMessage({ type: "state", visitors: [visitor] })).toBe(true);
    expect(isPresenceMessage({ type: "state", visitors: [{ ...visitor, inGame: null, gameMetadata: null }] })).toBe(
        true,
    );
    expect(
        isPresenceMessage({
            type: "state",
            visitors: [
                {
                    ...visitor,
                    cursorColor: "red",
                    convexUserId: "user",
                    inGame: "chess",
                    gameMetadata: { side: "white" },
                },
            ],
        }),
    ).toBe(true);

    for (const patch of [
        { visitorId: null },
        { displayName: 2 },
        { isOwner: "false" },
        { x: null },
        { y: Infinity },
        { chatMessage: {} },
        { inMenu: null },
        { tabbedOut: 1 },
        { cursorColor: false },
        { convexUserId: 3 },
        { inGame: true },
        { gameMetadata: [] },
    ]) {
        expect(isPresenceMessage({ type: "state", visitors: [{ ...visitor, ...patch }] })).toBe(false);
    }
});

test("client ingress normalizes legacy chat and identity fields while enforcing bounds", async () => {
    const { parseClientPresenceMessage: parse } = await import("../shared/validatePresenceMessage");
    expect(parse({ type: "chat", visitorId: "v", text: 3 })).toEqual({ type: "chat", visitorId: "v", text: null });
    expect(parse({ type: "chat", visitorId: "v", text: "x".repeat(501) })?.type).toBe("chat");
    expect(parse({ type: "join", visitorId: "v", displayName: "V", isOwner: false, convexUserId: 3 })).toMatchObject({
        convexUserId: undefined,
    });
    for (const value of [
        { type: "state", visitors: [] },
        { type: "leave", visitorId: "" },
        { type: "rename", visitorId: "v", displayName: "" },
        { type: "cursor", visitorId: "v", x: 10001, y: 0 },
        { type: "cursor", visitorId: "v", x: 0, y: 0, gameMetadata: { nested: {} } },
    ])
        expect(parse(value)).toBeNull();
});

test("client ingress strips unrelated fields before validation and broadcast", async () => {
    const { parseClientPresenceMessage: parse } = await import("../shared/validatePresenceMessage");
    expect(parse({ type: "leave", visitorId: "v", displayName: "", cursorColor: 3, secret: true })).toEqual({
        type: "leave",
        visitorId: "v",
    });
});
