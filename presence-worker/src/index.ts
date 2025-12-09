import { Hono } from "hono";
import { cors } from "hono/cors";

export { PresenceRoom } from "./PresenceRoom";

type Bindings = {
    PRESENCE_ROOM: DurableObjectNamespace;
    DEBUG_PRESENCE_SECRET?: string;
};

const app = new Hono<{ Bindings: Bindings }>();

const ALLOWED_ORIGINS = new Set<string>([
    "https://cozytab.club",
    "http://localhost:8787",
    "http://localhost:5173",
    "http://localhost:4173",
]);

const resolveOrigin = (origin: string | null): string | undefined | null => {
    if (!origin) return origin;
    const normalized = origin.toLowerCase();
    return ALLOWED_ORIGINS.has(normalized) ? origin : undefined;
};

// Enable CORS for allowed frontends
app.use(
    "*",
    cors({
        origin: resolveOrigin,
        allowMethods: ["GET", "POST", "OPTIONS"],
        allowHeaders: ["Content-Type", "Upgrade", "Connection"],
    })
);

// Health check endpoint
app.get("/", (c) => {
    return c.json({ status: "ok", service: "nook-presence" });
});

// WebSocket endpoint - route to Durable Object
app.get("/ws/:roomId", async (c) => {
    const roomId = c.req.param("roomId");
    const upgradeHeader = c.req.header("Upgrade");

    if (!upgradeHeader || upgradeHeader.toLowerCase() !== "websocket") {
        return c.text("Expected WebSocket upgrade", 426);
    }

    // Get or create the Durable Object for this room
    const id = c.env.PRESENCE_ROOM.idFromName(roomId);
    const stub = c.env.PRESENCE_ROOM.get(id);

    // Forward the WebSocket request to the Durable Object
    return stub.fetch(c.req.raw);
});

// Get current room state (for debugging/reconnection) - gated behind a secret
app.get("/room/:roomId", async (c) => {
    const secret = c.env.DEBUG_PRESENCE_SECRET;
    const provided = c.req.header("x-debug-secret");
    if (!secret || !provided || provided !== secret) {
        return c.text("Not found", 404);
    }

    const roomId = c.req.param("roomId");
    const id = c.env.PRESENCE_ROOM.idFromName(roomId);
    const stub = c.env.PRESENCE_ROOM.get(id);

    const response = await stub.fetch(new Request("http://internal/state"));
    return response;
});

export default app;
