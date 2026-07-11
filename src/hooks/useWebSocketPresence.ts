import { useCallback, useEffect, useRef, useState } from "react";
import { PRESENCE_THROTTLE_MS } from "@shared/gameTypes";
import { ROOM_WIDTH, ROOM_HEIGHT } from "@/time/roomConstants";
import type { PresenceMessage, PresenceVisitor } from "@shared/presenceProtocol";
import { applyPresenceMessage, DEFAULT_PRESENCE_POSITION } from "@/presence/presenceState";
import {
    PresenceTransport,
    type PresenceConnectionError as ConnectionError,
    type PresenceConnectionState as ConnectionState,
} from "@/presence/PresenceTransport";
import {
    REMOTE_KEYUP_MAX_DELAY_MS,
    REMOTE_KEYUP_MIN_DELAY_MS,
    useRemoteTypingAudio,
} from "@/presence/useRemoteTypingAudio";

// Padding to keep cursor visible at room edges (in room coordinates)
const CURSOR_EDGE_PADDING = 180;

/**
 * Clamp cursor coordinates to room bounds with padding to ensure visibility
 */
function clampCursorToRoomBounds(x: number, y: number): { x: number; y: number } {
    const minX = CURSOR_EDGE_PADDING;
    const minY = CURSOR_EDGE_PADDING;
    const maxX = ROOM_WIDTH - CURSOR_EDGE_PADDING;
    const maxY = ROOM_HEIGHT - CURSOR_EDGE_PADDING;

    return {
        x: Math.max(minX, Math.min(maxX, x)),
        y: Math.max(minY, Math.min(maxY, y)),
    };
}

export type VisitorState = PresenceVisitor;

const DEFAULT_WS_URL = "ws://100.94.163.58:8787";
const THROTTLE_MS = PRESENCE_THROTTLE_MS;
const DEFAULT_POSITION = DEFAULT_PRESENCE_POSITION;
export { REMOTE_KEYUP_MIN_DELAY_MS, REMOTE_KEYUP_MAX_DELAY_MS };

export type { ConnectionState, ConnectionError };

function resolveWsBaseUrl() {
    const envUrl = import.meta.env.VITE_PRESENCE_WS_URL;
    if (envUrl) {
        return envUrl.replace(/^http(s?):/i, (_match: string, ssl?: string) => (ssl ? "wss:" : "ws:"));
    }

    if (typeof window !== "undefined") {
        const { protocol, hostname, port } = window.location;
        const wsProtocol = protocol === "https:" ? "wss:" : "ws:";
        // Always route WebSocket through port 8787 for local dev (handles mobile/network testing)
        const inferredPort = !port || port === "5173" || port === "4173" ? "8787" : port;
        const portPart = inferredPort ? `:${inferredPort}` : "";
        return `${wsProtocol}//${hostname}${portPart}`;
    }

    return DEFAULT_WS_URL;
}

const getInitialCursor = () => {
    if (typeof window === "undefined") {
        return { x: 0, y: 0 };
    }
    return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
};

function clearTimeoutRef(ref: { current: ReturnType<typeof setTimeout> | null }) {
    if (!ref.current) return;
    clearTimeout(ref.current);
    ref.current = null;
}

export function useWebSocketPresence(
    roomId: string | null,
    visitorId: string,
    displayName: string,
    isOwner: boolean,
    cursorColor?: string,
    convexUserId?: string
) {
    const wsRef = useRef<WebSocket | null>(null);
    const latestDisplayNameRef = useRef(displayName);
    const latestCursorColorRef = useRef<string | undefined>(cursorColor);
    const latestConvexUserIdRef = useRef<string | undefined>(convexUserId);
    const previousDisplayNameRef = useRef(displayName);
    const [visitors, setVisitors] = useState<VisitorState[]>([]);
    const visitorsRef = useRef<VisitorState[]>([]);
    const [screenCursor, setScreenCursor] = useState(getInitialCursor);
    const [localChatMessage, setLocalChatMessage] = useState<string | null>(null);
    const [connectionState, setConnectionState] = useState<ConnectionState>("connecting");
    const [connectionError, setConnectionError] = useState<ConnectionError | null>(null);
    const transportRef = useRef<PresenceTransport | null>(null);

    const lastSendTimeRef = useRef<number>(0);
    const pendingCursorRef = useRef<{ x: number; y: number } | null>(null);
    const throttleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const hasSentCursorRef = useRef(false);
    const inMenuRef = useRef(false);
    const tabbedOutRef = useRef<boolean>(
        typeof document !== "undefined" ? document.visibilityState === "hidden" : false
    );
    const inGameRef = useRef<string | null>(null);
    const gameMetadataRef = useRef<Record<string, unknown> | null>(null);
    const lastBroadcastCursorRef = useRef<{ x: number; y: number }>({ ...DEFAULT_POSITION });
    const setVisitorsAndStore = useCallback(
        (updater: VisitorState[] | ((prev: VisitorState[]) => VisitorState[])) => {
            setVisitors((prev) => {
                const next = typeof updater === "function" ? (updater as (p: VisitorState[]) => VisitorState[])(prev) : updater;
                visitorsRef.current = next;
                return next;
            });
        },
        []
    );

    const queueRemoteTypingSounds = useRemoteTypingAudio(visitorsRef);

    const sendMessage = useCallback((msg: PresenceMessage) => {
        transportRef.current?.send(JSON.stringify(msg));
    }, []);

    const handleIncomingMessage = useCallback((event: MessageEvent) => {
        if (typeof event.data !== "string") return;

        if (event.data === "pong") {
            transportRef.current?.acknowledgeHeartbeat();
            return;
        }

        let data: PresenceMessage | null = null;
        try {
            data = JSON.parse(event.data) as PresenceMessage;
        } catch (error) {
            console.error("[Presence] Error parsing message", error);
            return;
        }

        if (data.type === "chat" && data.visitorId !== visitorId) {
            queueRemoteTypingSounds(data.visitorId, data.text);
        }
        setVisitorsAndStore((previous) =>
            applyPresenceMessage(previous, data, { inMenu: inMenuRef.current, inGame: inGameRef.current })
        );
    }, [queueRemoteTypingSounds, setVisitorsAndStore, visitorId]);

    useEffect(() => {
        latestCursorColorRef.current = cursorColor;
    }, [cursorColor]);

    useEffect(() => {
        latestConvexUserIdRef.current = convexUserId;
    }, [convexUserId]);

    useEffect(() => {
        latestDisplayNameRef.current = displayName;
    }, [displayName]);

    useEffect(() => {
        if (displayName === previousDisplayNameRef.current) return;
        previousDisplayNameRef.current = displayName;

        const ws = wsRef.current;
        if (ws?.readyState === WebSocket.OPEN) {
            sendMessage({
                type: "rename",
                visitorId,
                displayName,
                cursorColor: latestCursorColorRef.current,
            });
        }
    }, [displayName, sendMessage, visitorId]);

    const reconnectNow = useCallback(() => {
        if (!roomId || !visitorId) return;
        transportRef.current?.reconnect();
    }, [roomId, visitorId]);

    useEffect(() => {
        if (!roomId || !visitorId) return;
        const baseUrl = resolveWsBaseUrl().replace(/\/$/, "");
        const attemptedUrl = `${baseUrl}/ws/${roomId}`;
        const transport = new PresenceTransport({
            url: attemptedUrl,
            onMessage: handleIncomingMessage,
            onSocket: (socket) => { wsRef.current = socket; },
            onState: (state) => {
                setConnectionState(state);
                if (state === "connected") setConnectionError(null);
                if (state === "reconnecting") setVisitorsAndStore([]);
            },
            onError: (error) => setConnectionError(error),
            onOpen: () => {
                hasSentCursorRef.current = false;
                sendMessage({
                    type: "join",
                    visitorId,
                    displayName: latestDisplayNameRef.current,
                    isOwner,
                    cursorColor: latestCursorColorRef.current,
                    tabbedOut: tabbedOutRef.current,
                    convexUserId: latestConvexUserIdRef.current,
                });
            },
        });
        transportRef.current = transport;
        transport.start();

        return () => {
            clearTimeoutRef(throttleTimeoutRef);
            sendMessage({ type: "leave", visitorId });
            transport.stop();
            if (transportRef.current === transport) transportRef.current = null;
            setVisitorsAndStore([]);
        };
    }, [handleIncomingMessage, isOwner, roomId, sendMessage, setVisitorsAndStore, visitorId]);

    // Send cursor position with throttling
    const buildCursorMessage = useCallback(
        (x: number, y: number, color?: string, inMenu?: boolean, tabbedOut?: boolean, inGame?: string | null, gameMetadata?: Record<string, unknown> | null): PresenceMessage => ({
            type: "cursor",
            visitorId,
            x,
            y,
            cursorColor: color ?? latestCursorColorRef.current,
            inMenu: inMenu ?? inMenuRef.current,
            tabbedOut: typeof tabbedOut === "boolean" ? tabbedOut : tabbedOutRef.current,
            inGame: inGame !== undefined ? inGame : inGameRef.current,
            gameMetadata: gameMetadata !== undefined ? gameMetadata : gameMetadataRef.current,
        }),
        [visitorId]
    );

    const sendCursor = useCallback(
        (
            x: number,
            y: number,
            color?: string,
            opts?: { inMenu?: boolean; force?: boolean; tabbedOut?: boolean; inGame?: string | null; gameMetadata?: Record<string, unknown> | null }
        ): boolean => {
            const ws = wsRef.current;
            if (!visitorId || !ws || ws.readyState !== WebSocket.OPEN) return false;

            const now = Date.now();
            const timeSinceLastSend = now - lastSendTimeRef.current;
            const transmit = (nextX: number, nextY: number) => {
                // Clamp to room bounds with padding to ensure visibility
                const clamped = clampCursorToRoomBounds(nextX, nextY);
                lastSendTimeRef.current = Date.now();
                lastBroadcastCursorRef.current = { x: clamped.x, y: clamped.y };
                sendMessage(buildCursorMessage(clamped.x, clamped.y, color, opts?.inMenu, opts?.tabbedOut, opts?.inGame, opts?.gameMetadata));
            };

            // Clamp the input coordinates immediately
            const clampedInput = clampCursorToRoomBounds(x, y);

            if (opts?.force || timeSinceLastSend >= THROTTLE_MS) {
                transmit(clampedInput.x, clampedInput.y);
                pendingCursorRef.current = null;
                return true;
            }

            pendingCursorRef.current = { x: clampedInput.x, y: clampedInput.y };

            if (!throttleTimeoutRef.current) {
                throttleTimeoutRef.current = setTimeout(() => {
                    throttleTimeoutRef.current = null;
                    if (pendingCursorRef.current && wsRef.current?.readyState === WebSocket.OPEN) {
                        transmit(pendingCursorRef.current.x, pendingCursorRef.current.y);
                        pendingCursorRef.current = null;
                    }
                }, THROTTLE_MS - timeSinceLastSend);
            }
            return true;
        },
        [buildCursorMessage, sendMessage, visitorId]
    );

    // Update cursor position (matches usePresence API)
    const updateCursor = useCallback(
        (
            roomX: number,
            roomY: number,
            screenX: number,
            screenY: number,
            shouldBroadcast: boolean = true
        ) => {
            setScreenCursor({ x: screenX, y: screenY });
            const shouldSend = shouldBroadcast || !hasSentCursorRef.current;
            if (!shouldSend) return;

            const didSend = sendCursor(roomX, roomY, latestCursorColorRef.current);
            if (didSend) hasSentCursorRef.current = true;
        },
        [sendCursor]
    );

    // Update chat message
    const updateChatMessage = useCallback(
        (message: string | null) => {
            setLocalChatMessage(message);
            if (!visitorId) return;
            sendMessage({ type: "chat", visitorId, text: message });
        },
        [sendMessage, visitorId]
    );

    const setInMenu = useCallback(
        (next: boolean) => {
            if (!visitorId) return;
            if (inMenuRef.current === next) return;

            inMenuRef.current = next;
            const { x, y } = lastBroadcastCursorRef.current;
            sendCursor(x, y, latestCursorColorRef.current, { inMenu: next, force: true });
        },
        [sendCursor, visitorId]
    );

    const setInGame = useCallback(
        (gameItemId: string | null) => {
            if (!visitorId) return;
            if (inGameRef.current === gameItemId) return;

            inGameRef.current = gameItemId;
            // Clear gameMetadata when switching games or leaving a game to avoid cross-game leakage
            // Send null explicitly so it propagates over JSON
            gameMetadataRef.current = null;
            const { x, y } = lastBroadcastCursorRef.current;
            sendCursor(x, y, latestCursorColorRef.current, { inGame: gameItemId, gameMetadata: null, force: true });

            // Optimistically update local visitor state (server excludes sender from broadcast)
            setVisitorsAndStore((prev) =>
                prev.map((v) =>
                    v.visitorId === visitorId
                        ? { ...v, inGame: gameItemId, gameMetadata: null }
                        : v
                )
            );
        },
        [sendCursor, visitorId, setVisitorsAndStore]
    );

    const setGameMetadata = useCallback(
        (metadata: Record<string, unknown> | null) => {
            if (!visitorId) return;
            gameMetadataRef.current = metadata;
            const { x, y } = lastBroadcastCursorRef.current;
            sendCursor(x, y, latestCursorColorRef.current, { gameMetadata: metadata, force: true });

            // Optimistically update local visitor state (server excludes sender from broadcast)
            setVisitorsAndStore((prev) =>
                prev.map((v) =>
                    v.visitorId === visitorId
                        ? { ...v, gameMetadata: metadata }
                        : v
                )
            );
        },
        [sendCursor, visitorId, setVisitorsAndStore]
    );

    useEffect(() => {
        if (!roomId) return;
        if (typeof document === "undefined") return;

        const handleVisibilityChange = () => {
            const hidden = document.visibilityState === "hidden";
            tabbedOutRef.current = hidden;
            const { x, y } = lastBroadcastCursorRef.current;
            sendCursor(x, y, latestCursorColorRef.current, { tabbedOut: hidden, force: true });

            const ws = wsRef.current;
            if (hidden && ws?.readyState === WebSocket.OPEN) {
                try {
                    ws.send("ping");
                } catch {
                    // Ignore send errors when tab is hidden
                }
            }
        };

        handleVisibilityChange();
        document.addEventListener("visibilitychange", handleVisibilityChange);
        return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
    }, [roomId, sendCursor]);

    return {
        visitors,
        updateCursor,
        updateChatMessage,
        screenCursor,
        localChatMessage,
        setInMenu,
        setInGame,
        setGameMetadata,
        connectionState,
        connectionError,
        reconnectNow,
        // No batchInterval needed - direct updates
        batchInterval: 0,
        wsRef,
    };
}
