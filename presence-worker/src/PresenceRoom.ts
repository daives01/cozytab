import { DurableObject } from "cloudflare:workers";
import { parseClientPresenceMessage } from "../../shared/validatePresenceMessage";
import type {
    ClientPresenceMessage,
    PresenceMessage,
    PresenceVisitor as VisitorState,
} from "../../shared/presenceProtocol";

export interface Env {
    PRESENCE_ROOM: DurableObjectNamespace;
}

type WebSocketAttachment = {
    // TODO(security): bind a future signed room capability here before trusting owner identity or game actions.
    visitorId: string;
    displayName: string;
    isOwner: boolean;
    cursorColor?: string;
    tabbedOut?: boolean;
    inGame?: string | null;
    gameMetadata?: Record<string, unknown> | null;
    convexUserId?: string;
    x?: number;
    y?: number;
};

// Attachments are internal state written by handleJoin and updateAttachment, never raw client messages.
function readAttachment(socket: WebSocket): WebSocketAttachment | null {
    // SAFETY: handleJoin serializes a typed WebSocketAttachment; updateAttachment merges typed patches into it.
    // Cloudflare restores that same structured-cloned attachment across hibernation; an unbound socket returns null.
    return socket.deserializeAttachment() as WebSocketAttachment | null;
}

function visitorFromAttachment(attachment: WebSocketAttachment): VisitorState {
    return {
        visitorId: attachment.visitorId,
        displayName: attachment.displayName,
        isOwner: attachment.isOwner,
        x: attachment.x ?? DEFAULT_POSITION.x,
        y: attachment.y ?? DEFAULT_POSITION.y,
        chatMessage: null,
        cursorColor: attachment.cursorColor,
        inMenu: false,
        tabbedOut: attachment.tabbedOut ?? false,
        inGame: attachment.inGame ?? null,
        gameMetadata: attachment.gameMetadata,
        convexUserId: attachment.convexUserId,
    };
}

const DEFAULT_POSITION = { x: 960, y: 540 };
const MAX_MESSAGE_SIZE_BYTES = 8192;
const textEncoder = new TextEncoder();

export class PresenceRoom extends DurableObject<Env> {
    private visitors: Map<string, VisitorState> = new Map();

    constructor(ctx: DurableObjectState, env: Env) {
        super(ctx, env);
        this.ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair("ping", "pong"));
    }

    private hydrateVisitorsFromSockets() {
        for (const socket of this.ctx.getWebSockets()) {
            const att = readAttachment(socket);

            if (!att?.visitorId) continue;

            if (!this.visitors.has(att.visitorId)) {
                this.visitors.set(att.visitorId, visitorFromAttachment(att));
            }
        }
    }

    async fetch(request: Request): Promise<Response> {
        const url = new URL(request.url);

        if (url.pathname === "/state") {
            return Response.json({ visitors: Array.from(this.visitors.values()) });
        }

        const upgradeHeader = request.headers.get("Upgrade");

        if (!upgradeHeader || upgradeHeader.toLowerCase() !== "websocket") {
            return new Response("Expected WebSocket", { status: 426 });
        }

        const pair = new WebSocketPair();
        const [client, server] = [pair[0], pair[1]];

        this.ctx.acceptWebSocket(server);

        return new Response(null, {
            status: 101,
            webSocket: client,
        });
    }

    async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
        if (typeof message !== "string") return;

        if (textEncoder.encode(message).length > MAX_MESSAGE_SIZE_BYTES) {
            ws.close(1009, "Payload too large");

            return;
        }

        if (message === "ping") {
            try {
                ws.send("pong");
            } catch (e) {
                console.error("[DO] Error responding to ping:", e);
            }

            return;
        }

        let data: ClientPresenceMessage | null;

        try {
            data = parseClientPresenceMessage(JSON.parse(message));
        } catch (e) {
            console.error("[DO] Error processing message:", e);
            ws.close(1003, "Invalid JSON");

            return;
        }

        if (!data) {
            ws.close(1008, "Invalid message");

            return;
        }

        if (data.type === "join") {
            this.handleJoin(ws, data);
            return;
        }
        const visitor = this.getVisitorOrClose(ws, data.visitorId);
        if (!visitor) return;

        switch (data.type) {
            case "cursor":
                this.handleCursor(data, ws, visitor);
                break;
            case "rename":
                this.handleRename(data, ws, visitor);
                break;
            case "chat":
                visitor.chatMessage = data.text;
                this.broadcast(ws, data);
                break;
            case "leave":
                this.handleLeave(visitor.visitorId, ws);
        }
    }

    async webSocketClose(ws: WebSocket, _code: number, _reason: string): Promise<void> {
        this.hydrateVisitorsFromSockets();
        this.detachVisitor(ws);
    }

    async webSocketError(ws: WebSocket, error: unknown): Promise<void> {
        console.error("[DO] WebSocket error:", error);
        this.hydrateVisitorsFromSockets();
        this.detachVisitor(ws);
    }

    private handleJoin(ws: WebSocket, data: Extract<PresenceMessage, { type: "join" }>) {
        this.hydrateVisitorsFromSockets();

        const existingAttachment = readAttachment(ws);

        if (existingAttachment && existingAttachment.visitorId !== data.visitorId) {
            ws.close(1008, "Visitor already bound");

            return;
        }

        const existingVisitor = this.visitors.get(data.visitorId);
        const x = existingVisitor?.x ?? DEFAULT_POSITION.x;
        const y = existingVisitor?.y ?? DEFAULT_POSITION.y;

        const attachment: WebSocketAttachment = {
            visitorId: data.visitorId,
            displayName: data.displayName,
            isOwner: data.isOwner,
            cursorColor: data.cursorColor,
            tabbedOut: data.tabbedOut,
            inGame: existingVisitor?.inGame ?? null,
            gameMetadata: existingVisitor?.gameMetadata,
            convexUserId: data.convexUserId,
            x,
            y,
        };

        ws.serializeAttachment(attachment);

        this.visitors.set(data.visitorId, {
            visitorId: data.visitorId,
            displayName: data.displayName,
            isOwner: data.isOwner,
            x,
            y,
            chatMessage: existingVisitor?.chatMessage ?? null,
            cursorColor: data.cursorColor,
            inMenu: existingVisitor?.inMenu ?? false,
            tabbedOut: Boolean(data.tabbedOut),
            inGame: existingVisitor?.inGame ?? null,
            gameMetadata: existingVisitor?.gameMetadata,
            convexUserId: data.convexUserId,
        });

        const stateMsg: PresenceMessage = {
            type: "state",
            visitors: Array.from(this.visitors.values()),
        };

        ws.send(JSON.stringify(stateMsg));

        this.broadcast(ws, data);
    }

    private ensureVisitorFromAttachment(ws: WebSocket, visitorId: string): VisitorState | null {
        const attachment = readAttachment(ws);

        if (!attachment || attachment.visitorId !== visitorId) return null;

        const visitor = visitorFromAttachment(attachment);

        this.visitors.set(visitorId, visitor);

        return visitor;
    }

    private updateAttachment(ws: WebSocket, patch: Partial<Omit<WebSocketAttachment, "visitorId">>) {
        const prev = readAttachment(ws);

        if (!prev) return;
        ws.serializeAttachment({ ...prev, ...patch });
    }

    private handleCursor(data: Extract<PresenceMessage, { type: "cursor" }>, ws: WebSocket, visitor: VisitorState) {
        visitor.x = data.x;
        visitor.y = data.y;

        const attachmentPatch: Partial<Omit<WebSocketAttachment, "visitorId">> = {
            x: data.x,
            y: data.y,
        };

        if (data.cursorColor) {
            visitor.cursorColor = data.cursorColor;
            attachmentPatch.cursorColor = data.cursorColor;
        }

        if (typeof data.inMenu === "boolean") {
            visitor.inMenu = data.inMenu;
        }

        if (typeof data.tabbedOut === "boolean") {
            visitor.tabbedOut = data.tabbedOut;
            attachmentPatch.tabbedOut = data.tabbedOut;
        }

        if (data.inGame !== undefined) {
            const prevInGame = visitor.inGame;
            visitor.inGame = data.inGame;
            attachmentPatch.inGame = data.inGame;

            // Auto-clear gameMetadata when leaving a game
            if (prevInGame && !data.inGame) {
                visitor.gameMetadata = undefined;
                attachmentPatch.gameMetadata = undefined;
            }
        }

        if (data.gameMetadata !== undefined) {
            // null explicitly clears, object sets, undefined is no-op (already handled by !== undefined check)
            visitor.gameMetadata = data.gameMetadata ?? undefined;
            attachmentPatch.gameMetadata = data.gameMetadata ?? undefined;
        }

        this.updateAttachment(ws, attachmentPatch);

        this.broadcast(ws, data);
    }

    private handleRename(data: Extract<PresenceMessage, { type: "rename" }>, ws: WebSocket, visitor: VisitorState) {
        visitor.displayName = data.displayName;

        const attachmentPatch: Partial<Omit<WebSocketAttachment, "visitorId">> = {
            displayName: data.displayName,
        };

        if (data.cursorColor) {
            visitor.cursorColor = data.cursorColor;
            attachmentPatch.cursorColor = data.cursorColor;
        }

        this.updateAttachment(ws, attachmentPatch);

        this.broadcast(ws, data);
    }

    private detachVisitor(ws: WebSocket) {
        try {
            const attachment = readAttachment(ws);

            if (attachment?.visitorId) {
                this.handleLeave(attachment.visitorId, ws);
            }
        } catch (e) {
            console.error("[DO] Error detaching visitor:", e);
        }
    }

    private getVisitorOrClose(ws: WebSocket, visitorId: string): VisitorState | null {
        const attachment = readAttachment(ws);
        const visitor =
            attachment?.visitorId === visitorId
                ? (this.visitors.get(visitorId) ?? this.ensureVisitorFromAttachment(ws, visitorId))
                : null;

        if (!visitor) {
            ws.close(1008, "Join required");

            return null;
        }

        return visitor;
    }

    private handleLeave(visitorId: string, excludeWs: WebSocket): void {
        this.ensureVisitorFromAttachment(excludeWs, visitorId);
        excludeWs.serializeAttachment(null);

        if (!this.visitors.has(visitorId)) {
            return;
        }

        for (const socket of this.ctx.getWebSockets()) {
            if (socket === excludeWs) continue;
            const att = readAttachment(socket);

            if (att?.visitorId === visitorId) {
                return;
            }
        }

        this.visitors.delete(visitorId);
        const leaveMsg: PresenceMessage = { type: "leave", visitorId };
        this.broadcast(excludeWs, leaveMsg);
    }

    private broadcast(excludeWs: WebSocket, message: PresenceMessage): void {
        const msgString = JSON.stringify(message);

        for (const socket of this.ctx.getWebSockets()) {
            if (socket === excludeWs) continue;

            if (socket.readyState !== WebSocket.OPEN) continue;

            try {
                socket.send(msgString);
            } catch (e) {
                console.error("[DO] Error sending to WebSocket:", e);
            }
        }
    }
}
