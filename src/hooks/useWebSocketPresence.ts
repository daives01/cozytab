import { useCallback, useEffect, useRef, useState } from "react";

type PresenceMessage =
    | { type: "join"; visitorId: string; displayName: string; isOwner: boolean; cursorColor?: string }
    | { type: "leave"; visitorId: string }
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

const WS_URL = import.meta.env.VITE_PRESENCE_WS_URL || "ws://localhost:8787";

const THROTTLE_MS = 50;
const DEFAULT_POSITION = { x: 960, y: 540 };

const getInitialCursor = () => {
    if (typeof window === "undefined") {
        return { x: 0, y: 0 };
    }
    return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
};

export function useWebSocketPresence(
    roomId: string | null,
    visitorId: string,
    displayName: string,
    isOwner: boolean,
    cursorColor?: string
) {
    const wsRef = useRef<WebSocket | null>(null);
    const [visitors, setVisitors] = useState<VisitorState[]>([]);
    const [screenCursor, setScreenCursor] = useState(getInitialCursor);
    const [localChatMessage, setLocalChatMessage] = useState<string | null>(null);

    const lastSendTimeRef = useRef<number>(0);
    const pendingCursorRef = useRef<{ x: number; y: number } | null>(null);
    const throttleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
            console.error("Error parsing WebSocket message:", error);
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
        if (!roomId || !visitorId) return;

        const ws = new WebSocket(`${WS_URL}/ws/${roomId}`);
        wsRef.current = ws;

        ws.onopen = () => {
            sendMessage({
                type: "join",
                visitorId,
                displayName,
                isOwner,
                cursorColor,
            });
        };

        ws.onmessage = handleIncomingMessage;

        ws.onerror = (error) => {
            console.error("[Presence] WebSocket error:", error);
        };

        ws.onclose = () => {
            wsRef.current = null;
            setVisitors([]);
        };

        return () => {
            if (throttleTimeoutRef.current) {
                clearTimeout(throttleTimeoutRef.current);
            }

            if (ws.readyState === WebSocket.OPEN) {
                sendMessage({ type: "leave", visitorId });
            }
            ws.close();
            wsRef.current = null;
            setVisitors([]);
        };
    }, [cursorColor, displayName, handleIncomingMessage, isOwner, roomId, sendMessage, visitorId]);

    // Send cursor position with throttling
    const sendCursor = useCallback((x: number, y: number, color?: string) => {
        if (!visitorId) return;
        const now = Date.now();
        const timeSinceLastSend = now - lastSendTimeRef.current;

        if (timeSinceLastSend >= THROTTLE_MS) {
            // Send immediately
            lastSendTimeRef.current = now;
            sendMessage({ type: "cursor", visitorId, x, y, cursorColor: color });
            pendingCursorRef.current = null;
        } else {
            // Queue for later
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
                            cursorColor: color,
                        });
                        pendingCursorRef.current = null;
                    }
                }, THROTTLE_MS - timeSinceLastSend);
            }
        }
    }, [sendMessage, visitorId]);

    // Update cursor position (matches usePresence API)
    const updateCursor = useCallback(
        (roomX: number, roomY: number, screenX: number, screenY: number) => {
            setScreenCursor({ x: screenX, y: screenY });
            sendCursor(roomX, roomY, cursorColor);
        },
        [cursorColor, sendCursor]
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
