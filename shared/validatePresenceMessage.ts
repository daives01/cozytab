import type { PresenceMessage, PresenceVisitor } from "./presenceProtocol";

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
