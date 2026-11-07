import { mock, expect, test } from "bun:test";

mock.module("cloudflare:workers", () => ({
    DurableObject: class {
        constructor(public ctx: unknown) {}
    },
}));
const { PresenceRoom } = await import("../presence-worker/src/PresenceRoom");

class Socket {
    attachment: unknown = null;
    readyState = 1;
    sent: string[] = [];
    closed: number | undefined;
    deserializeAttachment() {
        return this.attachment;
    }
    serializeAttachment(value: unknown) {
        this.attachment = value;
    }
    send(value: string) {
        this.sent.push(value);
    }
    close(code: number) {
        this.closed = code;
    }
}

function room() {
    const sockets = [new Socket(), new Socket()];
    const ctx = { getWebSockets: () => sockets, setWebSocketAutoResponse() {} };
    const instance = new PresenceRoom(ctx as never, {} as never);
    const send = (socket: Socket, value: unknown) => instance.webSocketMessage(socket as never, JSON.stringify(value));
    return { sockets, send };
}

// These tests exercise application transitions with socket doubles, not Cloudflare hibernation itself.
test("joined identity gates actions even when the target visitor is cached", async () => {
    const previous = globalThis.WebSocketRequestResponsePair;
    globalThis.WebSocketRequestResponsePair = class {} as never;
    try {
        const {
            sockets: [owner, stranger],
            send,
        } = room();
        await send(owner, { type: "join", visitorId: "a", displayName: "A", isOwner: false });
        await send(stranger, { type: "chat", visitorId: "a", text: "spoof" });
        expect(stranger.closed).toBe(1008);
        expect(owner.sent).toHaveLength(1);
        await send(owner, { type: "join", visitorId: "b", displayName: "B", isOwner: false });
        expect(owner.closed).toBe(1008);
    } finally {
        globalThis.WebSocketRequestResponsePair = previous;
    }
});

test("leave removes socket binding; actions require rejoin", async () => {
    const previous = globalThis.WebSocketRequestResponsePair;
    globalThis.WebSocketRequestResponsePair = class {} as never;
    try {
        const {
            sockets: [socket],
            send,
        } = room();
        const join = { type: "join", visitorId: "a", displayName: "A", isOwner: false };
        await send(socket, join);
        await send(socket, { type: "leave", visitorId: "a" });
        expect(socket.attachment).toBeNull();
        await send(socket, { type: "cursor", visitorId: "a", x: 1, y: 2 });
        expect(socket.closed).toBe(1008);
        await send(socket, join);
        expect(socket.attachment).toMatchObject({ visitorId: "a" });
    } finally {
        globalThis.WebSocketRequestResponsePair = previous;
    }
});
