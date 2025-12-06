import { DurableObject } from "cloudflare:workers";
export type PresenceMessage =
    | { type: "join"; visitorId: string; displayName: string; isOwner: boolean; cursorColor?: string }
    | { type: "leave"; visitorId: string }
    | { type: "rename"; visitorId: string; displayName: string; cursorColor?: string }
    | { type: "cursor"; visitorId: string; x: number; y: number; cursorColor?: string }
    | { type: "chat"; visitorId: string; text: string | null }
    | { type: "state"; visitors: VisitorState[] };

export type VisitorState = {
    visitorId: string;
    displayName: string;
    isOwner: boolean;
    x: number;
    y: number;
    chatMessage: string | null;
    cursorColor?: string;
};

type WebSocketAttachment = {
    visitorId: string;
    displayName: string;
    isOwner: boolean;
};

const DEFAULT_POSITION = { x: 960, y: 540 };

export class PresenceRoom extends DurableObject {
    private visitors: Map<string, VisitorState> = new Map();

    constructor(ctx: DurableObjectState, env: object) {
        super(ctx, env);
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

        let data: PresenceMessage | null = null;
        try {
            data = JSON.parse(message) as PresenceMessage;
        } catch (e) {
            console.error("[DO] Error processing message:", e);
            return;
        }

        switch (data.type) {
            case "join":
                this.handleJoin(ws, data);
                break;
            case "cursor":
                this.handleCursor(data, ws);
                break;
            case "rename":
                this.handleRename(data, ws);
                break;
            case "chat":
                this.handleChat(data, ws);
                break;
            case "leave":
                this.handleLeave(data.visitorId, ws);
                break;
            default:
                console.warn("[DO] Unknown message type", (data as { type?: string })?.type);
        }
    }

    async webSocketClose(ws: WebSocket, _code: number, _reason: string): Promise<void> {
        this.detachVisitor(ws);
    }

    async webSocketError(ws: WebSocket, error: unknown): Promise<void> {
        console.error("[DO] WebSocket error:", error);
        this.detachVisitor(ws);
    }

    private handleJoin(ws: WebSocket, data: Extract<PresenceMessage, { type: "join" }>) {
        const attachment: WebSocketAttachment = {
            visitorId: data.visitorId,
            displayName: data.displayName,
            isOwner: data.isOwner,
        };

        this.ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair("ping", "pong"));
        ws.serializeAttachment(attachment);

        this.visitors.set(data.visitorId, {
            visitorId: data.visitorId,
            displayName: data.displayName,
            isOwner: data.isOwner,
            x: DEFAULT_POSITION.x,
            y: DEFAULT_POSITION.y,
            chatMessage: null,
            cursorColor: data.cursorColor,
        });

        const stateMsg: PresenceMessage = {
            type: "state",
            visitors: Array.from(this.visitors.values()),
        };
        ws.send(JSON.stringify(stateMsg));

        this.broadcast(ws, data);
    }

    private ensureVisitorFromAttachment(ws: WebSocket, visitorId: string): VisitorState | null {
        const attachment = ws.deserializeAttachment() as WebSocketAttachment | null;
        if (!attachment || attachment.visitorId !== visitorId) return null;

        const visitor: VisitorState = {
            visitorId: attachment.visitorId,
            displayName: attachment.displayName,
            isOwner: attachment.isOwner,
            x: DEFAULT_POSITION.x,
            y: DEFAULT_POSITION.y,
            chatMessage: null,
            cursorColor: undefined,
        };
        this.visitors.set(visitorId, visitor);
        return visitor;
    }

    private handleCursor(data: Extract<PresenceMessage, { type: "cursor" }>, ws: WebSocket) {
        const visitor = this.visitors.get(data.visitorId) ?? this.ensureVisitorFromAttachment(ws, data.visitorId);

        if (visitor) {
            visitor.x = data.x;
            visitor.y = data.y;
            if (data.cursorColor) {
                visitor.cursorColor = data.cursorColor;
            }
        }

        this.broadcast(ws, data);
    }

    private handleChat(data: Extract<PresenceMessage, { type: "chat" }>, ws: WebSocket) {
        const visitor = this.visitors.get(data.visitorId) ?? this.ensureVisitorFromAttachment(ws, data.visitorId);

        if (visitor) {
            visitor.chatMessage = data.text;
        }

        this.broadcast(ws, data);
    }

    private handleRename(data: Extract<PresenceMessage, { type: "rename" }>, ws: WebSocket) {
        const visitor = this.visitors.get(data.visitorId) ?? this.ensureVisitorFromAttachment(ws, data.visitorId);

        if (visitor) {
            visitor.displayName = data.displayName;
            if (data.cursorColor) {
                visitor.cursorColor = data.cursorColor;
            }
        }

        this.broadcast(ws, data);
    }

    private detachVisitor(ws: WebSocket) {
        try {
            const attachment = ws.deserializeAttachment() as WebSocketAttachment | null;
            if (attachment?.visitorId) {
                this.handleLeave(attachment.visitorId, ws);
            }
        } catch (e) {
            console.error("[DO] Error detaching visitor:", e);
        }
    }

    private handleLeave(visitorId: string, excludeWs: WebSocket): void {
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
