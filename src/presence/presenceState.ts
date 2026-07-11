import type { PresenceMessage, PresenceVisitor } from "@shared/presenceProtocol";

export const DEFAULT_PRESENCE_POSITION = { x: 960, y: 540 };

export function applyPresenceMessage(
    visitors: PresenceVisitor[],
    message: PresenceMessage,
    context: { inMenu: boolean; inGame: string | null }
): PresenceVisitor[] {
    switch (message.type) {
        case "state":
            return message.visitors.map((visitor) => ({ ...visitor, inMenu: Boolean(visitor.inMenu), tabbedOut: Boolean(visitor.tabbedOut) }));
        case "join":
            if (visitors.some((visitor) => visitor.visitorId === message.visitorId)) return visitors;
            return [...visitors, {
                visitorId: message.visitorId,
                displayName: message.displayName,
                isOwner: message.isOwner,
                x: DEFAULT_PRESENCE_POSITION.x,
                y: DEFAULT_PRESENCE_POSITION.y,
                chatMessage: null,
                cursorColor: message.cursorColor,
                inMenu: false,
                tabbedOut: Boolean(message.tabbedOut),
                inGame: null,
                convexUserId: message.convexUserId,
            }];
        case "leave":
            return visitors.filter((visitor) => visitor.visitorId !== message.visitorId);
        case "rename":
            return visitors.map((visitor) => visitor.visitorId === message.visitorId
                ? { ...visitor, displayName: message.displayName, cursorColor: message.cursorColor ?? visitor.cursorColor }
                : visitor);
        case "chat":
            return visitors.map((visitor) => visitor.visitorId === message.visitorId ? { ...visitor, chatMessage: message.text } : visitor);
        case "cursor": {
            const theirInMenu = message.inMenu ?? false;
            const theirInGame = message.inGame ?? null;
            const sameContext = context.inGame === theirInGame && (context.inMenu === theirInMenu || (context.inGame !== null && theirInGame !== null));
            return visitors.map((visitor) => visitor.visitorId === message.visitorId ? {
                ...visitor,
                ...(sameContext ? { x: message.x, y: message.y } : {}),
                cursorColor: message.cursorColor ?? visitor.cursorColor,
                inMenu: message.inMenu ?? visitor.inMenu,
                tabbedOut: message.tabbedOut ?? visitor.tabbedOut,
                inGame: message.inGame !== undefined ? message.inGame : visitor.inGame,
                gameMetadata: message.gameMetadata !== undefined ? message.gameMetadata : visitor.gameMetadata,
            } : visitor);
        }
    }
}
