import { DurableObject } from "cloudflare:workers";

export interface Env {
    PRESENCE_ROOM: DurableObjectNamespace;
}

export type PresenceMessage =
    | {
          type: "join";
          visitorId: string;
          displayName: string;
          isOwner: boolean;
          cursorColor?: string;
          tabbedOut?: boolean;
      }
    | { type: "leave"; visitorId: string }
    | { type: "rename"; visitorId: string; displayName: string; cursorColor?: string }
    | {
          type: "cursor";
          visitorId: string;
          x: number;
          y: number;
          cursorColor?: string;
          inMenu?: boolean;
          tabbedOut?: boolean;
          inGame?: string | null;
          gameMetadata?: Record<string, unknown> | null;
      }
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
    inMenu: boolean;
    tabbedOut: boolean;
    inGame?: string | null;
    gameMetadata?: Record<string, unknown> | null;
};

type WebSocketAttachment = {
    visitorId: string;
    displayName: string;
    isOwner: boolean;
    cursorColor?: string;
    tabbedOut?: boolean;
    inGame?: string | null;
    gameMetadata?: Record<string, unknown> | null;
};

const DEFAULT_POSITION = { x: 960, y: 540 };
const MAX_MESSAGE_SIZE_BYTES = 8192;
const MAX_NAME_LENGTH = 64;
const MAX_CHAT_LENGTH = 500;
const MAX_COORDINATE = 10000;
const textEncoder = new TextEncoder();

function isFiniteNumber(value: unknown): value is number {
    return typeof value === "number" && Number.isFinite(value);
}

function isValidId(value: unknown): value is string {
    return typeof value === "string" && value.length > 0 && value.length <= 128;
}

function isValidDisplayName(value: unknown): value is string {
    return typeof value === "string" && value.length > 0 && value.length <= MAX_NAME_LENGTH;
}

function isValidCursorColor(value: unknown): value is string | undefined {
    return value === undefined || (typeof value === "string" && value.length <= 32);
}

function isValidBoolean(value: unknown): value is boolean | undefined {
    return value === undefined || typeof value === "boolean";
}

function isValidInGame(value: unknown): value is string | null | undefined {
    return value === undefined || value === null || (typeof value === "string" && value.length <= 128);
}

function isValidGameMetadata(value: unknown): value is Record<string, unknown> | null | undefined {
    return value === undefined || value === null || (typeof value === "object" && value !== null && !Array.isArray(value));
}

function isValidCursorPayload(data: { [key: string]: unknown }): boolean {
    if (
        !isValidId(data.visitorId) ||
        !isFiniteNumber(data.x) ||
        !isFiniteNumber(data.y) ||
        Math.abs(data.x as number) > MAX_COORDINATE ||
        Math.abs(data.y as number) > MAX_COORDINATE
    ) {
        return false;
    }
    if (!isValidCursorColor(data.cursorColor)) return false;
    if (!isValidBoolean(data.inMenu)) return false;
    if (!isValidBoolean(data.tabbedOut)) return false;
    if (!isValidInGame(data.inGame)) return false;
    if (!isValidGameMetadata(data.gameMetadata)) return false;
    return true;
}

function clampChatMessage(value: unknown): string | null {
    if (value === null) return null;
    if (typeof value !== "string") return null;
    return value.slice(0, MAX_CHAT_LENGTH);
}

function validateMessage(raw: unknown): PresenceMessage | null {
    if (typeof raw !== "object" || raw === null || typeof (raw as { type?: unknown }).type !== "string") {
        return null;
    }

    const data = raw as { [key: string]: unknown; type: string };

    switch (data.type) {
        case "join": {
            if (!isValidId(data.visitorId) || !isValidDisplayName(data.displayName) || typeof data.isOwner !== "boolean") {
                return null;
            }
            if (!isValidCursorColor(data.cursorColor)) return null;
            if (!isValidBoolean(data.tabbedOut)) return null;
            return {
                type: "join",
                visitorId: data.visitorId,
                displayName: data.displayName,
                isOwner: data.isOwner,
                cursorColor: data.cursorColor,
                tabbedOut: typeof data.tabbedOut === "boolean" ? data.tabbedOut : undefined,
            };
        }
        case "leave": {
            if (!isValidId(data.visitorId)) return null;
            return { type: "leave", visitorId: data.visitorId };
        }
        case "rename": {
            if (!isValidId(data.visitorId) || !isValidDisplayName(data.displayName)) return null;
            if (!isValidCursorColor(data.cursorColor)) return null;
            return {
                type: "rename",
                visitorId: data.visitorId,
                displayName: data.displayName,
                cursorColor: data.cursorColor,
            };
        }
        case "cursor": {
            if (!isValidCursorPayload(data)) return null;
            const { visitorId, x, y, cursorColor, inMenu, tabbedOut, inGame, gameMetadata } = data as unknown as {
                visitorId: string;
                x: number;
                y: number;
                cursorColor?: string;
                inMenu?: boolean;
                tabbedOut?: boolean;
                inGame?: string | null;
                gameMetadata?: Record<string, unknown> | null;
            };
            return {
                type: "cursor",
                visitorId,
                x,
                y,
                cursorColor,
                inMenu,
                tabbedOut: typeof tabbedOut === "boolean" ? tabbedOut : undefined,
                inGame: inGame !== undefined ? inGame : undefined,
                gameMetadata: gameMetadata !== undefined ? gameMetadata : undefined,
            };
        }
        case "chat": {
            if (!isValidId(data.visitorId)) return null;
            return { type: "chat", visitorId: data.visitorId, text: clampChatMessage(data.text) };
        }
        case "state": {
            return null;
        }
        default:
            return null;
    }
}

export class PresenceRoom extends DurableObject<Env> {
    private visitors: Map<string, VisitorState> = new Map();

    constructor(ctx: DurableObjectState, env: Env) {
        super(ctx, env);
        this.ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair("ping", "pong"));
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

        let data: PresenceMessage | null = null;
        try {
            data = validateMessage(JSON.parse(message));
        } catch (e) {
            console.error("[DO] Error processing message:", e);
            ws.close(1003, "Invalid JSON");
            return;
        }

        if (!data) {
            ws.close(1008, "Invalid message");
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
        const existingAttachment = ws.deserializeAttachment() as WebSocketAttachment | null;
        if (existingAttachment && existingAttachment.visitorId !== data.visitorId) {
            ws.close(1008, "Visitor already bound");
            return;
        }

        const attachment: WebSocketAttachment = {
            visitorId: data.visitorId,
            displayName: data.displayName,
            isOwner: data.isOwner,
            cursorColor: data.cursorColor,
            tabbedOut: data.tabbedOut,
            inGame: null,
            gameMetadata: undefined,
        };

        ws.serializeAttachment(attachment);

        this.visitors.set(data.visitorId, {
            visitorId: data.visitorId,
            displayName: data.displayName,
            isOwner: data.isOwner,
            x: DEFAULT_POSITION.x,
            y: DEFAULT_POSITION.y,
            chatMessage: null,
            cursorColor: data.cursorColor,
            inMenu: false,
            tabbedOut: Boolean(data.tabbedOut),
            inGame: null,
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
            cursorColor: attachment.cursorColor,
            inMenu: false,
            tabbedOut: attachment.tabbedOut ?? false,
            inGame: attachment.inGame ?? null,
            gameMetadata: attachment.gameMetadata,
        };
        this.visitors.set(visitorId, visitor);
        return visitor;
    }

    private updateAttachment(ws: WebSocket, patch: Partial<Omit<WebSocketAttachment, "visitorId">>) {
        const prev = ws.deserializeAttachment() as WebSocketAttachment | null;
        if (!prev) return;
        ws.serializeAttachment({ ...prev, ...patch });
    }

    private handleCursor(data: Extract<PresenceMessage, { type: "cursor" }>, ws: WebSocket) {
        const visitor = this.getVisitorOrClose(ws, data.visitorId);
        if (!visitor) return;

        visitor.x = data.x;
        visitor.y = data.y;

        const attachmentPatch: Partial<Omit<WebSocketAttachment, "visitorId">> = {};

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

        if (Object.keys(attachmentPatch).length > 0) {
            this.updateAttachment(ws, attachmentPatch);
        }

        this.broadcast(ws, data);
    }

    private handleChat(data: Extract<PresenceMessage, { type: "chat" }>, ws: WebSocket) {
        const visitor = this.getVisitorOrClose(ws, data.visitorId);
        if (!visitor) return;

        visitor.chatMessage = data.text;

        this.broadcast(ws, data);
    }

    private handleRename(data: Extract<PresenceMessage, { type: "rename" }>, ws: WebSocket) {
        const visitor = this.getVisitorOrClose(ws, data.visitorId);
        if (!visitor) return;

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
            const attachment = ws.deserializeAttachment() as WebSocketAttachment | null;
            if (attachment?.visitorId) {
                this.handleLeave(attachment.visitorId, ws);
            }
        } catch (e) {
            console.error("[DO] Error detaching visitor:", e);
        }
    }

    private getVisitorOrClose(ws: WebSocket, visitorId: string): VisitorState | null {
        const visitor = this.visitors.get(visitorId) ?? this.ensureVisitorFromAttachment(ws, visitorId);
        if (!visitor) {
            ws.close(1008, "Join required");
            return null;
        }
        return visitor;
    }

    private handleLeave(visitorId: string, excludeWs: WebSocket): void {
        if (!this.visitors.has(visitorId)) {
            return;
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
