import { DurableObject } from "cloudflare:workers";
export class PresenceRoom extends DurableObject {
    // In-memory state for all connected visitors
    visitors = new Map();
    constructor(ctx, env) {
        super(ctx, env);
    }
    async fetch(request) {
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
    async webSocketMessage(ws, message) {
        if (typeof message !== "string") {
            return;
        }
        try {
            const data = JSON.parse(message);
            switch (data.type) {
                case "join": {
                    // Store visitor info using WebSocket tags
                    const attachment = {
                        visitorId: data.visitorId,
                        displayName: data.displayName,
                        isOwner: data.isOwner,
                    };
                    // Use serializeAttachment to store data with the WebSocket
                    this.ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair("ping", "pong"));
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
                    const stateMsg = {
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
        }
        catch (e) {
            console.error("[DO] Error processing message:", e);
        }
    }
    async webSocketClose(ws, _code, _reason) {
        try {
            const attachment = ws.deserializeAttachment();
            if (attachment?.visitorId) {
                this.handleLeave(attachment.visitorId, ws);
            }
        }
        catch (e) {
            console.error("[DO] Error on close:", e);
        }
    }
    async webSocketError(ws, error) {
        console.error("[DO] WebSocket error:", error);
        try {
            const attachment = ws.deserializeAttachment();
            if (attachment?.visitorId) {
                this.handleLeave(attachment.visitorId, ws);
            }
        }
        catch (e) {
            console.error("[DO] Error handling ws error:", e);
        }
    }
    handleLeave(visitorId, excludeWs) {
        this.visitors.delete(visitorId);
        const leaveMsg = {
            type: "leave",
            visitorId,
        };
        this.broadcast(excludeWs, leaveMsg);
    }
    broadcast(excludeWs, message) {
        const msgString = JSON.stringify(message);
        const sockets = this.ctx.getWebSockets();
        for (const ws of sockets) {
            if (ws !== excludeWs && ws.readyState === WebSocket.OPEN) {
                try {
                    ws.send(msgString);
                }
                catch (e) {
                    console.error("[DO] Error sending to WebSocket:", e);
                }
            }
        }
    }
}
