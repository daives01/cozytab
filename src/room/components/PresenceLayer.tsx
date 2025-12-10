import type { VisitorState } from "../../hooks/useWebSocketPresence";
import { PresenceCursor } from "../PresenceCursor";

interface PresenceLayerProps {
    visitors: VisitorState[];
    currentVisitorId: string | null;
    scale: number;
}

export function PresenceLayer({ visitors, currentVisitorId, scale }: PresenceLayerProps) {
    return (
        <>
            {visitors
                .filter((visitor) => visitor.visitorId !== currentVisitorId)
                .map((visitor) => (
                    <PresenceCursor
                        key={visitor.visitorId}
                        name={visitor.displayName}
                        isOwner={visitor.isOwner}
                        x={visitor.x}
                        y={visitor.y}
                        chatMessage={visitor.chatMessage}
                        scale={scale}
                        cursorColor={visitor.cursorColor}
                        inMenu={visitor.inMenu}
                        tabbedOut={visitor.tabbedOut}
                    />
                ))}
        </>
    );
}
