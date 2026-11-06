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
