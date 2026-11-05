export type PresenceConnectionState = "connecting" | "connected" | "reconnecting" | "error";
export type PresenceConnectionError = {
    type: "network" | "timeout" | "unknown";
    message: string;
    attemptedUrl?: string;
};

const INITIAL_RETRY_DELAY_MS = 500;
const MAX_RETRY_DELAY_MS = 5000;

export class PresenceTransport {
    private readonly options: {
        url: string;
        onMessage: (event: MessageEvent) => void;
        onOpen: () => void;
        onState: (state: PresenceConnectionState) => void;
        onError: (error: PresenceConnectionError) => void;
        onSocket: (socket: WebSocket | null) => void;
    };
    private socket: WebSocket | null = null;
    private stopped = true;
    private retryDelay = INITIAL_RETRY_DELAY_MS;
    private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
    private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
    private heartbeatTimeout: ReturnType<typeof setTimeout> | null = null;

    constructor(options: {
        url: string;
        onMessage: (event: MessageEvent) => void;
        onOpen: () => void;
        onState: (state: PresenceConnectionState) => void;
        onError: (error: PresenceConnectionError) => void;
        onSocket: (socket: WebSocket | null) => void;
    }) {
        this.options = options;
    }

    start() {
        this.stopped = false;
        this.connect();
    }
    reconnect() {
        this.clearReconnect();
        this.stopped = false;
        this.socket?.close();
        this.connect();
    }
    send(message: string) {
        if (this.socket?.readyState !== WebSocket.OPEN) return false;
        this.socket.send(message);
        return true;
    }
    stop() {
        this.stopped = true;
        this.clearReconnect();
        this.clearHeartbeat();
        this.socket?.close();
        this.socket = null;
        this.options.onSocket(null);
    }

    private connect() {
        if (this.stopped) return;
        const socket = new WebSocket(this.options.url);
        this.socket = socket;
        this.options.onSocket(socket);
        this.options.onState("connecting");
        socket.onopen = () => {
            this.retryDelay = INITIAL_RETRY_DELAY_MS;
            this.options.onState("connected");
            this.startHeartbeat();
            this.options.onOpen();
        };
        socket.onmessage = this.options.onMessage;
        socket.onerror = () => {
            this.options.onError({
                type: "network",
                message: "Failed to connect to presence server",
                attemptedUrl: this.options.url,
            });
            this.options.onState("error");
            socket.close();
        };
        socket.onclose = () => {
            if (this.socket === socket) {
                this.socket = null;
                this.options.onSocket(null);
            }
            this.clearHeartbeat();
            if (this.stopped) return;
            this.options.onState("reconnecting");
            this.reconnectTimeout = setTimeout(() => this.connect(), this.retryDelay);
            this.retryDelay = Math.min(this.retryDelay * 2, MAX_RETRY_DELAY_MS);
        };
    }
    private startHeartbeat() {
        this.clearHeartbeat();
        const ping = () => {
            if (!this.send("ping")) return;
            if (this.heartbeatTimeout) clearTimeout(this.heartbeatTimeout);
            this.heartbeatTimeout = setTimeout(() => this.socket?.close(), 10_000);
        };
        ping();
        this.heartbeatInterval = setInterval(ping, 20_000);
    }
    acknowledgeHeartbeat() {
        if (this.heartbeatTimeout) clearTimeout(this.heartbeatTimeout);
        this.heartbeatTimeout = null;
    }
    private clearHeartbeat() {
        if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
        if (this.heartbeatTimeout) clearTimeout(this.heartbeatTimeout);
        this.heartbeatInterval = null;
        this.heartbeatTimeout = null;
    }
    private clearReconnect() {
        if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
        this.reconnectTimeout = null;
    }
}
