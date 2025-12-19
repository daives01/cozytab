import { useCallback, useEffect, useRef, useState } from "react";
import { playKeyDown, playKeyUp } from "../lib/typingAudio";
import { isAudioUnlocked } from "@/lib/audio";
import { isKeyboardSoundEnabled } from "./useKeyboardSoundSetting";

type PresenceMessage =
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
};

const DEFAULT_WS_URL = "ws://localhost:8787";
const THROTTLE_MS = 50;
const DEFAULT_POSITION = { x: 960, y: 540 };
const INITIAL_RETRY_DELAY_MS = 500;
const MAX_RETRY_DELAY_MS = 5000;
export const REMOTE_KEYUP_MIN_DELAY_MS = 45;
export const REMOTE_KEYUP_MAX_DELAY_MS = 100;

export type ConnectionState = "connecting" | "connected" | "reconnecting";

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

function clearTimeoutRef(ref: { current: ReturnType<typeof setTimeout> | null }) {
    if (!ref.current) return;
    clearTimeout(ref.current);
    ref.current = null;
}

function clearIntervalRef(ref: { current: ReturnType<typeof setInterval> | null }) {
    if (!ref.current) return;
    clearInterval(ref.current);
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
    const visitorsRef = useRef<VisitorState[]>([]);
    const [screenCursor, setScreenCursor] = useState(getInitialCursor);
    const [localChatMessage, setLocalChatMessage] = useState<string | null>(null);
    const remoteKeyupTimeoutsRef = useRef<Array<ReturnType<typeof setTimeout>>>([]);
    const [connectionState, setConnectionState] = useState<ConnectionState>("connecting");
    const isIntentionallyClosedRef = useRef(false);
    const connectFnRef = useRef<(() => void) | null>(null);

    const lastSendTimeRef = useRef<number>(0);
    const pendingCursorRef = useRef<{ x: number; y: number } | null>(null);
    const throttleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const heartbeatIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const heartbeatTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const hasSentCursorRef = useRef(false);
    const inMenuRef = useRef(false);
    const tabbedOutRef = useRef<boolean>(
        typeof document !== "undefined" ? document.visibilityState === "hidden" : false
    );
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

    const queueRemoteTypingSounds = useCallback((senderId: string, nextText: string | null) => {
        if (!isKeyboardSoundEnabled() || !isAudioUnlocked() || nextText === null) return;
        const prevVisitor = visitorsRef.current.find((v) => v.visitorId === senderId);
        const prevText = prevVisitor?.chatMessage ?? "";
        if (nextText.length <= prevText.length) return;

        const addedSegment = nextText.slice(prevText.length);
        const range = Math.max(REMOTE_KEYUP_MAX_DELAY_MS - REMOTE_KEYUP_MIN_DELAY_MS, 0);

        for (const char of addedSegment) {
            const key = char === " " ? " " : char;
            playKeyDown(key);
            const delay = REMOTE_KEYUP_MIN_DELAY_MS + Math.random() * range;
            const timeout = setTimeout(() => playKeyUp(key), delay);
            remoteKeyupTimeoutsRef.current.push(timeout);
        }
    }, []);

    const resetHeartbeat = useCallback(() => {
        clearTimeoutRef(heartbeatTimeoutRef);
    }, []);

    const startHeartbeat = useCallback(
        (ws: WebSocket) => {
            clearIntervalRef(heartbeatIntervalRef);
            resetHeartbeat();

            const sendPing = () => {
                if (ws.readyState !== WebSocket.OPEN) return;

                ws.send("ping");

                resetHeartbeat();
                heartbeatTimeoutRef.current = setTimeout(() => {
                    // Close to trigger reconnect if the server stops replying
                    ws.close();
                }, 10000);
            };

            // Kick off immediately, then on interval
            sendPing();
            heartbeatIntervalRef.current = setInterval(sendPing, 20000);
        },
        [resetHeartbeat]
    );

    const sendMessage = useCallback((msg: PresenceMessage) => {
        const ws = wsRef.current;
        if (!ws || ws.readyState !== WebSocket.OPEN) return;
        ws.send(JSON.stringify(msg));
    }, []);

    const handleIncomingMessage = useCallback((event: MessageEvent) => {
        if (typeof event.data !== "string") return;

        if (event.data === "pong") {
            resetHeartbeat();
            return;
        }

        let data: PresenceMessage | null = null;
        try {
            data = JSON.parse(event.data) as PresenceMessage;
        } catch (error) {
            console.error("[Presence] Error parsing message", error);
            return;
        }

        switch (data.type) {
            case "state":
                setVisitorsAndStore(
                    data.visitors.map((visitor) => ({
                        ...visitor,
                        inMenu: Boolean(visitor.inMenu),
                        tabbedOut: Boolean(visitor.tabbedOut),
                    }))
                );
                break;
            case "join":
                setVisitorsAndStore((prev) => {
                    const exists = prev.some((v) => v.visitorId === data.visitorId);
                    if (exists) return prev;
                    const next = [
                        ...prev,
                        {
                            visitorId: data.visitorId,
                            displayName: data.displayName,
                            isOwner: data.isOwner,
                            x: DEFAULT_POSITION.x,
                            y: DEFAULT_POSITION.y,
                            chatMessage: null,
                            cursorColor: data.cursorColor,
                            inMenu: false,
                            tabbedOut: Boolean(data.tabbedOut),
                        },
                    ];
                    return next;
                });
                break;
            case "leave":
                setVisitorsAndStore((prev) => prev.filter((v) => v.visitorId !== data.visitorId));
                break;
            case "cursor":
                setVisitorsAndStore((prev) =>
                    prev.map((v) =>
                        v.visitorId === data.visitorId
                            ? {
                                  ...v,
                                  x: data.x,
                                  y: data.y,
                                  cursorColor: data.cursorColor ?? v.cursorColor,
                                  inMenu: typeof data.inMenu === "boolean" ? data.inMenu : v.inMenu,
                                  tabbedOut:
                                      typeof data.tabbedOut === "boolean" ? data.tabbedOut : v.tabbedOut ?? false,
                              }
                            : v
                    )
                );
                break;
            case "rename":
                setVisitorsAndStore((prev) =>
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
                if (data.visitorId !== visitorId) {
                    queueRemoteTypingSounds(data.visitorId, data.text);
                }
                setVisitorsAndStore((prev) =>
                    prev.map((v) => (v.visitorId === data.visitorId ? { ...v, chatMessage: data.text } : v))
                );
                break;
            default:
                console.warn("[Presence] Unknown message type", (data as { type?: string })?.type);
        }
    }, [queueRemoteTypingSounds, resetHeartbeat, setVisitorsAndStore, visitorId]);

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

    const reconnectNow = useCallback(() => {
        if (!roomId || !visitorId) return;
        clearTimeoutRef(reconnectTimeoutRef);
        isIntentionallyClosedRef.current = false;
        if (connectFnRef.current) {
            connectFnRef.current();
        }
    }, [roomId, visitorId]);

    useEffect(() => {
        if (!roomId || !visitorId) {
            return;
        }

        let cancelled = false;
        let retryDelay = INITIAL_RETRY_DELAY_MS;
        const baseUrl = resolveWsBaseUrl().replace(/\/$/, "");

        const connect = () => {
            if (cancelled) return;
            hasSentCursorRef.current = false;
            isIntentionallyClosedRef.current = false;

            const ws = new WebSocket(`${baseUrl}/ws/${roomId}`);
            wsRef.current = ws;
            setConnectionState("connecting");

            ws.onopen = () => {
                retryDelay = INITIAL_RETRY_DELAY_MS;
                setConnectionState("connected");
                startHeartbeat(ws);
                sendMessage({
                    type: "join",
                    visitorId,
                    displayName: latestDisplayNameRef.current,
                    isOwner,
                    cursorColor: latestCursorColorRef.current,
                    tabbedOut: tabbedOutRef.current,
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
                clearIntervalRef(heartbeatIntervalRef);
                resetHeartbeat();

                if (cancelled || isIntentionallyClosedRef.current) {
                    return;
                }

                setConnectionState("reconnecting");
                reconnectTimeoutRef.current = setTimeout(connect, retryDelay);

                retryDelay = Math.min(retryDelay * 2, MAX_RETRY_DELAY_MS);
            };
        };

        connectFnRef.current = connect;
        connect();

        return () => {
            cancelled = true;
            isIntentionallyClosedRef.current = true;
            connectFnRef.current = null;
            clearTimeoutRef(throttleTimeoutRef);
            clearTimeoutRef(reconnectTimeoutRef);
            clearIntervalRef(heartbeatIntervalRef);
            resetHeartbeat();

            if (wsRef.current?.readyState === WebSocket.OPEN) {
                sendMessage({ type: "leave", visitorId });
                wsRef.current.close();
            }
            wsRef.current = null;
            setVisitors([]);
        };
    }, [handleIncomingMessage, isOwner, resetHeartbeat, roomId, sendMessage, startHeartbeat, visitorId]);

    // Send cursor position with throttling
    const buildCursorMessage = useCallback(
        (x: number, y: number, color?: string, inMenu?: boolean, tabbedOut?: boolean): PresenceMessage => ({
            type: "cursor",
            visitorId,
            x,
            y,
            cursorColor: color ?? latestCursorColorRef.current,
            inMenu: inMenu ?? inMenuRef.current,
            tabbedOut: typeof tabbedOut === "boolean" ? tabbedOut : tabbedOutRef.current,
        }),
        [visitorId]
    );

    const sendCursor = useCallback(
        (
            x: number,
            y: number,
            color?: string,
            opts?: { inMenu?: boolean; force?: boolean; tabbedOut?: boolean }
        ) => {
            if (!visitorId) return;

            const now = Date.now();
            const timeSinceLastSend = now - lastSendTimeRef.current;
            const transmit = (nextX: number, nextY: number) => {
                lastSendTimeRef.current = Date.now();
                lastBroadcastCursorRef.current = { x: nextX, y: nextY };
                sendMessage(buildCursorMessage(nextX, nextY, color, opts?.inMenu, opts?.tabbedOut));
            };

            if (opts?.force || timeSinceLastSend >= THROTTLE_MS) {
                transmit(x, y);
                pendingCursorRef.current = null;
                return;
            }

            pendingCursorRef.current = { x, y };

            if (!throttleTimeoutRef.current) {
                throttleTimeoutRef.current = setTimeout(() => {
                    throttleTimeoutRef.current = null;
                    if (pendingCursorRef.current && wsRef.current?.readyState === WebSocket.OPEN) {
                        transmit(pendingCursorRef.current.x, pendingCursorRef.current.y);
                        pendingCursorRef.current = null;
                    }
                }, THROTTLE_MS - timeSinceLastSend);
            }
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
                ws.send("ping");
            }
        };

        handleVisibilityChange();
        document.addEventListener("visibilitychange", handleVisibilityChange);
        return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
    }, [roomId, sendCursor]);

    useEffect(() => {
        return () => {
            remoteKeyupTimeoutsRef.current.forEach(clearTimeout);
            remoteKeyupTimeoutsRef.current = [];
        };
    }, []);

    return {
        visitors,
        updateCursor,
        updateChatMessage,
        screenCursor,
        localChatMessage,
        setInMenu,
        connectionState,
        reconnectNow,
        // No batchInterval needed - direct updates
        batchInterval: 0,
    };
}
