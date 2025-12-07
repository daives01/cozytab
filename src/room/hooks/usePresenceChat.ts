import { useMemo } from "react";
import { useWebSocketPresence, type VisitorState } from "../../hooks/useWebSocketPresence";

interface PresenceIdentity {
    id: string;
    name: string;
    cursorColor: string;
}

interface PresenceChatArgs {
    roomId: string | null;
    identity: PresenceIdentity;
    isOwner: boolean;
}

export function usePresenceAndChat({ roomId, identity, isOwner }: PresenceChatArgs) {
    const presence = useWebSocketPresence(roomId, identity.id, identity.name, isOwner, identity.cursorColor);

    const visitorCount = useMemo(
        () => presence.visitors.filter((visitor: VisitorState) => !visitor.isOwner).length,
        [presence.visitors]
    );

    return {
        ...presence,
        visitorCount,
        hasVisitors: visitorCount > 0,
    };
}
