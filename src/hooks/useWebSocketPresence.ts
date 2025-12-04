import { useCallback, useEffect, useRef, useState } from "react";

// Must match the backend types
type PresenceMessage =
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

// TODO: Replace with your deployed worker URL
const WS_URL = import.meta.env.VITE_PRESENCE_WS_URL || "ws://localhost:8787";

const THROTTLE_MS = 50; // Send cursor updates at most every 50ms

export function useWebSocketPresence(
    roomId: string | null,
    visitorId: string,
    displayName: string,
    isOwner: boolean
) {
    const wsRef = useRef<WebSocket | null>(null);
    const [visitors, setVisitors] = useState<VisitorState[]>([]);
    const [screenCursor, setScreenCursor] = useState({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
    const [localChatMessage, setLocalChatMessage] = useState<string | null>(null);

    const lastSendTimeRef = useRef<number>(0);
    const pendingCursorRef = useRef<{ x: number; y: number } | null>(null);
    const throttleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Connect to WebSocket when roomId changes
    useEffect(() => {
        if (!roomId || !visitorId) {
            return;
        }


        const ws = new WebSocket(`${WS_URL}/ws/${roomId}`);
        wsRef.current = ws;

        ws.onopen = () => {
            // Send join message
            const joinMsg: PresenceMessage = {
                type: "join",
                visitorId,
                displayName,
                isOwner,
            };
            ws.send(JSON.stringify(joinMsg));
        };

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data) as PresenceMessage;

                switch (data.type) {
                    case "state": {
                        // Initial state from server
                        setVisitors(data.visitors);
                        break;
                    }

                    case "join": {
                        // New visitor joined
                        setVisitors((prev) => {
                            const exists = prev.some((v) => v.visitorId === data.visitorId);
                            if (exists) return prev;
                            return [
                                ...prev,
                                {
                                    visitorId: data.visitorId,
                                    displayName: data.displayName,
                                    isOwner: data.isOwner,
                                    x: 960,
                                    y: 540,
                                    chatMessage: null,
                                },
                            ];
                        });
                        break;
                    }

                    case "leave": {
                        // Visitor left
                        setVisitors((prev) => prev.filter((v) => v.visitorId !== data.visitorId));
                        break;
                    }

                    case "cursor": {
                        // Update visitor cursor position
                        setVisitors((prev) =>
                            prev.map((v) =>
                                v.visitorId === data.visitorId
                                    ? { ...v, x: data.x, y: data.y }
                                    : v
                            )
                        );
                        break;
                    }

                    case "chat": {
                        // Update visitor chat message
                        setVisitors((prev) =>
                            prev.map((v) =>
                                v.visitorId === data.visitorId
                                    ? { ...v, chatMessage: data.text }
                                    : v
                            )
                        );
                        break;
                    }
                }
            } catch (e) {
                console.error("Error parsing WebSocket message:", e);
            }
        };

        ws.onerror = (error) => {
            console.error("[Presence] WebSocket error:", error);
        };

        ws.onclose = () => {
            wsRef.current = null;
        };

        // Cleanup on unmount or roomId change
        return () => {
            if (throttleTimeoutRef.current) {
                clearTimeout(throttleTimeoutRef.current);
            }

            if (ws.readyState === WebSocket.OPEN) {
                const leaveMsg: PresenceMessage = {
                    type: "leave",
                    visitorId,
                };
                ws.send(JSON.stringify(leaveMsg));
            }
            ws.close();
            wsRef.current = null;
        };
    }, [roomId, visitorId, displayName, isOwner]);

    // Send cursor position with throttling
    const sendCursor = useCallback((x: number, y: number) => {
        const ws = wsRef.current;
        if (!ws || ws.readyState !== WebSocket.OPEN || !visitorId) return;

        const now = Date.now();
        const timeSinceLastSend = now - lastSendTimeRef.current;

        if (timeSinceLastSend >= THROTTLE_MS) {
            // Send immediately
            lastSendTimeRef.current = now;
            const msg: PresenceMessage = {
                type: "cursor",
                visitorId,
                x,
                y,
            };
            ws.send(JSON.stringify(msg));
            pendingCursorRef.current = null;
        } else {
            // Queue for later
            pendingCursorRef.current = { x, y };

            if (!throttleTimeoutRef.current) {
                throttleTimeoutRef.current = setTimeout(() => {
                    throttleTimeoutRef.current = null;
                    if (pendingCursorRef.current && wsRef.current?.readyState === WebSocket.OPEN) {
                        lastSendTimeRef.current = Date.now();
                        const msg: PresenceMessage = {
                            type: "cursor",
                            visitorId,
                            x: pendingCursorRef.current.x,
                            y: pendingCursorRef.current.y,
                        };
                        wsRef.current.send(JSON.stringify(msg));
                        pendingCursorRef.current = null;
                    }
                }, THROTTLE_MS - timeSinceLastSend);
            }
        }
    }, [visitorId]);

    // Update cursor position (matches usePresence API)
    const updateCursor = useCallback(
        (roomX: number, roomY: number, screenX: number, screenY: number) => {
            setScreenCursor({ x: screenX, y: screenY });
            sendCursor(roomX, roomY);
        },
        [sendCursor]
    );

    // Update chat message
    const updateChatMessage = useCallback(
        (message: string | null) => {
            setLocalChatMessage(message);

            const ws = wsRef.current;
            if (!ws || ws.readyState !== WebSocket.OPEN || !visitorId) return;

            const msg: PresenceMessage = {
                type: "chat",
                visitorId,
                text: message,
            };
            ws.send(JSON.stringify(msg));
        },
        [visitorId]
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
