import { DurableObject } from "cloudflare:workers";
import type { GameState, GamePlayer, GameCursor } from "../../shared/gameTypes";
import { createDefaultGameState } from "../../shared/gameTypes";

export type { GameState, GamePlayer, GameCursor };

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
      }
    | { type: "chat"; visitorId: string; text: string | null }
    | { type: "state"; visitors: VisitorState[] }
    | { type: "game_join"; visitorId: string; displayName: string; cursorColor?: string; itemId: string }
    | { type: "game_leave"; visitorId: string; itemId: string }
    | { type: "game_cursor"; visitorId: string; itemId: string; x: number; y: number; cursorColor?: string; gameMetadata?: Record<string, unknown> }
    | { type: "game_chat"; visitorId: string; itemId: string; text: string | null }
    | { type: "game_state"; itemId: string; state: GameState };

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
};

type WebSocketAttachment = {
    visitorId: string;
    displayName: string;
    isOwner: boolean;
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
            const { visitorId, x, y, cursorColor, inMenu, tabbedOut } = data as unknown as {
                visitorId: string;
                x: number;
                y: number;
                cursorColor?: string;
                inMenu?: boolean;
                tabbedOut?: boolean;
            };
            return {
                type: "cursor",
                visitorId,
                x,
                y,
                cursorColor,
                inMenu,
                tabbedOut: typeof tabbedOut === "boolean" ? tabbedOut : undefined,
            };
        }
        case "chat": {
            if (!isValidId(data.visitorId)) return null;
            return { type: "chat", visitorId: data.visitorId, text: clampChatMessage(data.text) };
        }
        case "state": {
            return null;
        }
        case "game_join": {
            if (!isValidId(data.visitorId) || !isValidDisplayName(data.displayName) || !isValidId(data.itemId)) return null;
            if (!isValidCursorColor(data.cursorColor)) return null;
            return {
                type: "game_join",
                visitorId: data.visitorId,
                displayName: data.displayName,
                cursorColor: data.cursorColor,
                itemId: data.itemId,
            };
        }
        case "game_leave": {
            if (!isValidId(data.visitorId) || !isValidId(data.itemId)) return null;
            return { type: "game_leave", visitorId: data.visitorId, itemId: data.itemId };
        }
        case "game_cursor": {
            if (!isValidId(data.visitorId) || !isValidId(data.itemId)) return null;
            if (!isFiniteNumber(data.x) || !isFiniteNumber(data.y)) return null;
            return {
                type: "game_cursor",
                visitorId: data.visitorId,
                itemId: data.itemId,
                x: data.x,
                y: data.y,
                cursorColor: isValidCursorColor(data.cursorColor) ? data.cursorColor : undefined,
                gameMetadata: data.gameMetadata && typeof data.gameMetadata === "object" ? data.gameMetadata : undefined,
            };
        }

        case "game_state": {
            return null;
        }
        default:
            return null;
    }
}

export class PresenceRoom extends DurableObject<Env> {
    private visitors: Map<string, VisitorState> = new Map();
    private games: Map<string, GameState> = new Map();

    constructor(ctx: DurableObjectState, env: Env) {
        super(ctx, env);
    }

    private getOrCreateGame(itemId: string): GameState {
        let game = this.games.get(itemId);
        if (!game) {
            game = createDefaultGameState("chess");
            this.games.set(itemId, game);
        }
        return game;
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
            case "game_join":
                this.handleGameJoin(ws, data);
                break;
            case "game_leave":
                this.handleGameLeave(ws, data);
                break;
            case "game_cursor":
                this.handleGameCursor(ws, data);
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
            inMenu: false,
            tabbedOut: Boolean(data.tabbedOut),
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
            inMenu: false,
            tabbedOut: false,
        };
        this.visitors.set(visitorId, visitor);
        return visitor;
    }

    private handleCursor(data: Extract<PresenceMessage, { type: "cursor" }>, ws: WebSocket) {
        const visitor = this.getVisitorOrClose(ws, data.visitorId);
        if (!visitor) return;

        visitor.x = data.x;
        visitor.y = data.y;
        if (data.cursorColor) {
            visitor.cursorColor = data.cursorColor;
        }
        if (typeof data.inMenu === "boolean") {
            visitor.inMenu = data.inMenu;
        }
        if (typeof data.tabbedOut === "boolean") {
            visitor.tabbedOut = data.tabbedOut;
        }
        if (data.inGame !== undefined) {
            visitor.inGame = data.inGame;
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
        if (data.cursorColor) {
            visitor.cursorColor = data.cursorColor;
        }

        this.broadcast(ws, data);
    }

    private detachVisitor(ws: WebSocket) {
        try {
            const attachment = ws.deserializeAttachment() as WebSocketAttachment | null;
            if (attachment?.visitorId) {
                // Clean up game presence for this visitor in all games
                this.removeVisitorFromAllGames(attachment.visitorId);
                // Clean up room presence
                this.handleLeave(attachment.visitorId, ws);
            }
        } catch (e) {
            console.error("[DO] Error detaching visitor:", e);
        }
    }

    private removeVisitorFromAllGames(visitorId: string) {
        for (const [itemId, game] of this.games) {
            const playerIndex = game.players.findIndex((p) => p.visitorId === visitorId);
            if (playerIndex !== -1) {
                game.players.splice(playerIndex, 1);
                delete game.cursors[visitorId];
                
                // Broadcast game_leave to all clients
                this.broadcastToAll({ type: "game_leave", visitorId, itemId });
                
                // Clean up empty games
                if (game.players.length === 0) {
                    this.games.delete(itemId);
                }
            }
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

    private broadcastToAll(message: PresenceMessage): void {
        const msgString = JSON.stringify(message);
        for (const socket of this.ctx.getWebSockets()) {
            if (socket.readyState !== WebSocket.OPEN) continue;
            try {
                socket.send(msgString);
            } catch (e) {
                console.error("[DO] Error sending to WebSocket:", e);
            }
        }
    }

    private handleGameJoin(ws: WebSocket, data: Extract<PresenceMessage, { type: "game_join" }>) {
        const game = this.getOrCreateGame(data.itemId);
        const existingPlayer = game.players.find((p) => p.visitorId === data.visitorId);
        if (!existingPlayer) {
            game.players.push({
                visitorId: data.visitorId,
                displayName: data.displayName,
                cursorColor: data.cursorColor,
                side: null,
            });
        }
        const stateMsg: PresenceMessage = { type: "game_state", itemId: data.itemId, state: game };
        ws.send(JSON.stringify(stateMsg));
        this.broadcast(ws, data);
    }

    private handleGameLeave(_ws: WebSocket, data: Extract<PresenceMessage, { type: "game_leave" }>) {
        const game = this.games.get(data.itemId);
        if (!game) return;
        game.players = game.players.filter((p) => p.visitorId !== data.visitorId);
        delete game.cursors[data.visitorId];
        if (game.players.length === 0) {
            this.games.delete(data.itemId);
        }
        this.broadcastToAll(data);
    }

    private handleGameCursor(_ws: WebSocket, data: Extract<PresenceMessage, { type: "game_cursor" }>) {
        const game = this.games.get(data.itemId);
        if (!game) return;
        game.cursors[data.visitorId] = {
            visitorId: data.visitorId,
            x: data.x,
            y: data.y,
            cursorColor: data.cursorColor,
            gameMetadata: data.gameMetadata,
        };
        this.broadcastToAll(data);
    }
}
