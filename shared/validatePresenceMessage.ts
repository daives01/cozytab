import type { ClientPresenceMessage, PresenceMessage, PresenceVisitor } from "./presenceProtocol";

function record(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function optional(value: unknown, kind: "string" | "boolean") {
    return value === undefined || typeof value === kind;
}

function metadata(value: unknown) {
    return value === undefined || value === null || record(value);
}

function finite(value: unknown) {
    return typeof value === "number" && Number.isFinite(value);
}

function visitor(value: unknown): value is PresenceVisitor {
    return (
        record(value) &&
        typeof value.visitorId === "string" &&
        typeof value.displayName === "string" &&
        typeof value.isOwner === "boolean" &&
        finite(value.x) &&
        finite(value.y) &&
        (value.chatMessage === null || typeof value.chatMessage === "string") &&
        typeof value.inMenu === "boolean" &&
        typeof value.tabbedOut === "boolean" &&
        optional(value.cursorColor, "string") &&
        optional(value.convexUserId, "string") &&
        (value.inGame === null || optional(value.inGame, "string")) &&
        metadata(value.gameMetadata)
    );
}

export function isPresenceMessage(value: unknown): value is PresenceMessage {
    if (!record(value)) return false;

    if (value.type === "state") return Array.isArray(value.visitors) && value.visitors.every(visitor);

    if (typeof value.visitorId !== "string") return false;

    switch (value.type) {
        case "leave":
            return true;
        case "chat":
            return value.text === null || typeof value.text === "string";
        case "rename":
            return typeof value.displayName === "string" && optional(value.cursorColor, "string");
        case "join":
            return (
                typeof value.displayName === "string" &&
                typeof value.isOwner === "boolean" &&
                optional(value.cursorColor, "string") &&
                optional(value.tabbedOut, "boolean") &&
                optional(value.convexUserId, "string")
            );
        case "cursor":
            return (
                finite(value.x) &&
                finite(value.y) &&
                optional(value.cursorColor, "string") &&
                optional(value.inMenu, "boolean") &&
                optional(value.tabbedOut, "boolean") &&
                (value.inGame === null || optional(value.inGame, "string")) &&
                metadata(value.gameMetadata)
            );
        default:
            return false;
    }
}

const MAX_GAME_METADATA_KEYS = 16;
const MAX_GAME_METADATA_SIZE = 1024;

function isValidGameMetadata(value: unknown): value is Record<string, unknown> | null | undefined {
    if (value === undefined || value === null) return true;

    if (typeof value !== "object" || Array.isArray(value)) return false;

    // SAFETY: null and arrays are excluded above; this view only reads own keys as unknown before validating each value.
    const obj = value as Record<string, unknown>;
    const keys = Object.keys(obj);

    if (keys.length > MAX_GAME_METADATA_KEYS) return false;

    // Shallow validation: primitives only, bounded size
    for (const key of keys) {
        if (key.length > 32) return false;
        const v = obj[key];

        if (v === null || v === undefined) continue;

        if (typeof v === "string" && v.length > 128) return false;

        if (typeof v === "number" && !Number.isFinite(v)) return false;

        if (typeof v !== "string" && typeof v !== "number" && typeof v !== "boolean") return false;
    }

    // Final size check to catch many small keys
    try {
        if (JSON.stringify(obj).length > MAX_GAME_METADATA_SIZE) return false;
    } catch {
        return false;
    }

    return true;
}

export function parseClientPresenceMessage(raw: unknown): ClientPresenceMessage | null {
    if (!record(raw)) return null;
    // Preserve the ingress normalizations separately from the server-to-client contract.
    const fields = {
        join: ["visitorId", "displayName", "isOwner", "cursorColor", "tabbedOut", "convexUserId"],
        leave: ["visitorId"],
        rename: ["visitorId", "displayName", "cursorColor"],
        cursor: ["visitorId", "x", "y", "cursorColor", "inMenu", "tabbedOut", "inGame", "gameMetadata"],
        chat: ["visitorId", "text"],
    };
    if (typeof raw.type !== "string" || !Object.hasOwn(fields, raw.type)) return null;
    // Only protocol fields cross the boundary; unknown client fields never reach broadcasts.
    const keys = fields[raw.type as keyof typeof fields];
    const normalized = Object.fromEntries([["type", raw.type], ...keys.map((key) => [key, raw[key]])]);
    if (raw.type === "chat") normalized.text = typeof raw.text === "string" ? raw.text.slice(0, 500) : null;
    if (raw.type === "join") {
        normalized.convexUserId =
            typeof raw.convexUserId === "string" && raw.convexUserId.length <= 128 ? raw.convexUserId : undefined;
    }
    if (!isPresenceMessage(normalized) || normalized.type === "state") return null;
    if (!normalized.visitorId || normalized.visitorId.length > 128) return null;
    if ("displayName" in normalized && (!normalized.displayName || normalized.displayName.length > 64)) return null;
    if ("cursorColor" in normalized && (normalized.cursorColor?.length ?? 0) > 32) return null;
    if (normalized.type === "cursor") {
        if (Math.abs(normalized.x) > 10000 || Math.abs(normalized.y) > 10000) return null;
        if ((normalized.inGame?.length ?? 0) > 128 || !isValidGameMetadata(normalized.gameMetadata)) return null;
    }
    return normalized;
}
