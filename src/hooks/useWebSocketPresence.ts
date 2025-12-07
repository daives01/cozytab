import { useCallback, useEffect, useRef, useState, type MutableRefObject } from "react";

type PresenceMessage =
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

const DEFAULT_WS_URL = "ws://localhost:8787";
const THROTTLE_MS = 50;
const DEFAULT_POSITION = { x: 960, y: 540 };
const INITIAL_RETRY_DELAY_MS = 500;
const MAX_RETRY_DELAY_MS = 5000;

function resolveWsBaseUrl() {
    const envUrl = import.meta.env.VITE_PRESENCE_WS_URL;
    if (envUrl) {
        return envUrl.replace(/^http(s?):/i, (_match: string, ssl?: string) => (ssl ? "wss:" : "ws:"));
    }

    if (typeof window !== "undefined") {
        const { protocol, hostname, port } = window.location;
        const isLocalhost = ["localhost", "127.0.0.1", "0.0.0.0"].includes(hostname);
        const wsProtocol = protocol === "https:" ? "wss:" : "ws:";
        const inferredPort =
            isLocalhost && (!port || port === "5173" || port === "4173") ? "8787" : port;
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

function clearTimeoutRef(ref: MutableRefObject<ReturnType<typeof setTimeout> | null>) {
    if (!ref.current) return;
    clearTimeout(ref.current);
    ref.current = null;
}

export function useWebSocketPresence(
    roomId: string | null,
    visitorId: string,
    displayName: string,
    isOwner: boolean,
    cursorColor?: string
) {
    const wsRef = useRef<WebSocket | null>(null);
    const latestDisplayNameRef = useRef(displayName);
    const latestCursorColorRef = useRef<string | undefined>(cursorColor);
    const previousDisplayNameRef = useRef(displayName);
    const [visitors, setVisitors] = useState<VisitorState[]>([]);
    const [screenCursor, setScreenCursor] = useState(getInitialCursor);
    const [localChatMessage, setLocalChatMessage] = useState<string | null>(null);

    const lastSendTimeRef = useRef<number>(0);
    const pendingCursorRef = useRef<{ x: number; y: number } | null>(null);
    const throttleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const hasSentCursorRef = useRef(false);

    const sendMessage = useCallback((msg: PresenceMessage) => {
        const ws = wsRef.current;
        if (!ws || ws.readyState !== WebSocket.OPEN) return;
        ws.send(JSON.stringify(msg));
    }, []);

    const handleIncomingMessage = useCallback((event: MessageEvent) => {
        if (typeof event.data !== "string") return;

        let data: PresenceMessage | null = null;
        try {
            data = JSON.parse(event.data) as PresenceMessage;
        } catch (error) {
            console.error("[Presence] Error parsing message", error);
            return;
        }

        switch (data.type) {
            case "state":
                setVisitors(data.visitors);
                break;
            case "join":
                setVisitors((prev) => {
                    const exists = prev.some((v) => v.visitorId === data.visitorId);
                    if (exists) return prev;
                    return [
                        ...prev,
                        {
                            visitorId: data.visitorId,
                            displayName: data.displayName,
                            isOwner: data.isOwner,
                            x: DEFAULT_POSITION.x,
                            y: DEFAULT_POSITION.y,
                            chatMessage: null,
                            cursorColor: data.cursorColor,
                        },
                    ];
                });
                break;
            case "leave":
                setVisitors((prev) => prev.filter((v) => v.visitorId !== data.visitorId));
                break;
            case "cursor":
                setVisitors((prev) =>
                    prev.map((v) =>
                        v.visitorId === data.visitorId
                            ? {
                                ...v,
                                x: data.x,
                                y: data.y,
                                cursorColor: data.cursorColor ?? v.cursorColor,
                            }
                            : v
                    )
                );
                break;
            case "rename":
                setVisitors((prev) =>
                    prev.map((v) =>
                        v.visitorId === data.visitorId
                            ? {
                                ...v,
                                displayName: data.displayName,
                                cursorColor: data.cursorColor ?? v.cursorColor,
                            }
                            : v
                    )
                );
                break;
            case "chat":
                setVisitors((prev) =>
                    prev.map((v) =>
                        v.visitorId === data.visitorId ? { ...v, chatMessage: data.text } : v
                    )
                );
                break;
            default:
                console.warn("[Presence] Unknown message type", (data as { type?: string })?.type);
        }
    }, []);

    useEffect(() => {
        latestCursorColorRef.current = cursorColor;
    }, [cursorColor]);

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

    useEffect(() => {
        if (!roomId || !visitorId) return;

        let cancelled = false;
        let retryDelay = INITIAL_RETRY_DELAY_MS;
        const baseUrl = resolveWsBaseUrl().replace(/\/$/, "");

        const connect = () => {
            if (cancelled) return;
            hasSentCursorRef.current = false;

            const ws = new WebSocket(`${baseUrl}/ws/${roomId}`);
            wsRef.current = ws;

            ws.onopen = () => {
                retryDelay = INITIAL_RETRY_DELAY_MS;
                sendMessage({
                    type: "join",
                    visitorId,
                    displayName: latestDisplayNameRef.current,
                    isOwner,
                    cursorColor: latestCursorColorRef.current,
                });
            };

            ws.onmessage = handleIncomingMessage;

            ws.onerror = (error) => {
                console.error("[Presence] WebSocket error:", error);
                ws.close();
            };

            ws.onclose = () => {
                wsRef.current = null;
                setVisitors([]);

                if (cancelled) return;

                reconnectTimeoutRef.current = setTimeout(connect, retryDelay);

                retryDelay = Math.min(retryDelay * 2, MAX_RETRY_DELAY_MS);
            };
        };

        connect();

        return () => {
            cancelled = true;
            clearTimeoutRef(throttleTimeoutRef);
            clearTimeoutRef(reconnectTimeoutRef);

            if (wsRef.current?.readyState === WebSocket.OPEN) {
                sendMessage({ type: "leave", visitorId });
                wsRef.current.close();
            }
            wsRef.current = null;
            setVisitors([]);
        };
    }, [handleIncomingMessage, isOwner, roomId, sendMessage, visitorId]);

    // Send cursor position with throttling
    const sendCursor = useCallback((x: number, y: number, color?: string) => {
        if (!visitorId) return;

        const now = Date.now();
        const timeSinceLastSend = now - lastSendTimeRef.current;
        const cursorColorToSend = color ?? latestCursorColorRef.current;

        if (timeSinceLastSend >= THROTTLE_MS) {
            lastSendTimeRef.current = now;
            sendMessage({ type: "cursor", visitorId, x, y, cursorColor: cursorColorToSend });
            pendingCursorRef.current = null;
            return;
        }

        pendingCursorRef.current = { x, y };

        if (!throttleTimeoutRef.current) {
            throttleTimeoutRef.current = setTimeout(() => {
                throttleTimeoutRef.current = null;
                if (pendingCursorRef.current && wsRef.current?.readyState === WebSocket.OPEN) {
                    lastSendTimeRef.current = Date.now();
                    sendMessage({
                        type: "cursor",
                        visitorId,
                        x: pendingCursorRef.current.x,
                        y: pendingCursorRef.current.y,
                        cursorColor: latestCursorColorRef.current,
                    });
                    pendingCursorRef.current = null;
                }
            }, THROTTLE_MS - timeSinceLastSend);
        }
    }, [sendMessage, visitorId]);

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

            sendCursor(roomX, roomY, latestCursorColorRef.current);
            hasSentCursorRef.current = true;
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

    return {
        visitors,
        updateCursor,
        updateChatMessage,
        screenCursor,
        localChatMessage,
        // No batchInterval needed - direct updates
        batchInterval: 0,
    };
}
