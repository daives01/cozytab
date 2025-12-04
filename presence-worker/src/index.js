import { Hono } from "hono";
import { cors } from "hono/cors";
export { PresenceRoom } from "./PresenceRoom";
const app = new Hono();
// Enable CORS for the frontend
app.use("*", cors({
    origin: "*", // In production, restrict to your domain
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type", "Upgrade", "Connection"],
}));
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
// Get current room state (for debugging/reconnection)
app.get("/room/:roomId", async (c) => {
    const roomId = c.req.param("roomId");
    const id = c.env.PRESENCE_ROOM.idFromName(roomId);
    const stub = c.env.PRESENCE_ROOM.get(id);
    const response = await stub.fetch(new Request("http://internal/state"));
    return response;
});
export default app;
