import { DurableObject } from "cloudflare:workers";

// Message types for presence
export type PresenceMessage =
    | { type: "join"; visitorId: string; displayName: string; isOwner: boolean }
    | { type: "leave"; visitorId: string }
    | { type: "cursor"; visitorId: string; x: number; y: number }
    | { type: "chat"; visitorId: string; text: string | null }
    | { type: "state"; visitors: VisitorState[] };

export type VisitorState = {
    visitorId: string;
    displayName: string;
    isOwner: boolean;
    x: number;
    y: number;
    chatMessage: string | null;
};

// Tag type for WebSocket state
type WebSocketAttachment = {
    visitorId: string;
    displayName: string;
    isOwner: boolean;
};

export class PresenceRoom extends DurableObject {
    // In-memory state for all connected visitors
    private visitors: Map<string, VisitorState> = new Map();

    constructor(ctx: DurableObjectState, env: object) {
        super(ctx, env);
    }

    async fetch(request: Request): Promise<Response> {
        const url = new URL(request.url);

        // Handle state request (for debugging/reconnection)
        if (url.pathname === "/state") {
            return Response.json({
                visitors: Array.from(this.visitors.values()),
            });
        }

        // Handle WebSocket upgrade
        const upgradeHeader = request.headers.get("Upgrade");
        if (!upgradeHeader || upgradeHeader.toLowerCase() !== "websocket") {
            return new Response("Expected WebSocket", { status: 426 });
        }

        const pair = new WebSocketPair();
        const [client, server] = [pair[0], pair[1]];

        // Accept the WebSocket with hibernation API
        this.ctx.acceptWebSocket(server);

        return new Response(null, {
            status: 101,
            webSocket: client,
        });
    }

    async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
        if (typeof message !== "string") {
            return;
        }

        try {
            const data = JSON.parse(message) as PresenceMessage;

            switch (data.type) {
                case "join": {
                    // Store visitor info using WebSocket tags
                    const attachment: WebSocketAttachment = {
                        visitorId: data.visitorId,
                        displayName: data.displayName,
                        isOwner: data.isOwner,
                    };
                    // Use serializeAttachment to store data with the WebSocket
                    this.ctx.setWebSocketAutoResponse(
                        new WebSocketRequestResponsePair("ping", "pong")
                    );

                    // Store the attachment in a map keyed by the serialized ws
                    ws.serializeAttachment(attachment);

                    // Add to visitors map
                    this.visitors.set(data.visitorId, {
                        visitorId: data.visitorId,
                        displayName: data.displayName,
                        isOwner: data.isOwner,
                        x: 960,
                        y: 540,
                        chatMessage: null,
                    });

                    // Send current state to the new visitor
                    const stateMsg: PresenceMessage = {
                        type: "state",
                        visitors: Array.from(this.visitors.values()),
                    };
                    ws.send(JSON.stringify(stateMsg));

                    // Broadcast join to all other visitors
                    this.broadcast(ws, data);
                    break;
                }

                case "cursor": {
                    // Update visitor position
                    const visitor = this.visitors.get(data.visitorId);
                    if (visitor) {
                        visitor.x = data.x;
                        visitor.y = data.y;
                    }

                    // Broadcast to all other visitors
                    this.broadcast(ws, data);
                    break;
                }

                case "chat": {
                    // Update visitor chat message
                    const visitor = this.visitors.get(data.visitorId);
                    if (visitor) {
                        visitor.chatMessage = data.text;
                    }

                    // Broadcast to all other visitors
                    this.broadcast(ws, data);
                    break;
                }

                case "leave": {
                    this.handleLeave(data.visitorId, ws);
                    break;
                }
            }
        } catch (e) {
            console.error("[DO] Error processing message:", e);
        }
    }

    async webSocketClose(ws: WebSocket, _code: number, _reason: string): Promise<void> {
        try {
            const attachment = ws.deserializeAttachment() as WebSocketAttachment | null;
            if (attachment?.visitorId) {
                this.handleLeave(attachment.visitorId, ws);
            }
        } catch (e) {
            console.error("[DO] Error on close:", e);
        }
    }

    async webSocketError(ws: WebSocket, error: unknown): Promise<void> {
        console.error("[DO] WebSocket error:", error);
        try {
            const attachment = ws.deserializeAttachment() as WebSocketAttachment | null;
            if (attachment?.visitorId) {
                this.handleLeave(attachment.visitorId, ws);
            }
        } catch (e) {
            console.error("[DO] Error handling ws error:", e);
        }
    }

    private handleLeave(visitorId: string, excludeWs: WebSocket): void {
        this.visitors.delete(visitorId);

        const leaveMsg: PresenceMessage = {
            type: "leave",
            visitorId,
        };
        this.broadcast(excludeWs, leaveMsg);
    }

    private broadcast(excludeWs: WebSocket, message: PresenceMessage): void {
        const msgString = JSON.stringify(message);
        const sockets = this.ctx.getWebSockets();

        for (const ws of sockets) {
            if (ws !== excludeWs && ws.readyState === WebSocket.OPEN) {
                try {
                    ws.send(msgString);
                } catch (e) {
                    console.error("[DO] Error sending to WebSocket:", e);
                }
            }
        }
    }
}
