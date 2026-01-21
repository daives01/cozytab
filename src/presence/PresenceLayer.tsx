import type { VisitorState } from "@/hooks/useWebSocketPresence";
import { PresenceCursor } from "./PresenceCursor";

interface PresenceLayerProps {
    visitors: VisitorState[];
    currentVisitorId: string | null;
    scale: number;
    currentGameId?: string | null;
}

export function PresenceLayer({ visitors, currentVisitorId, scale, currentGameId }: PresenceLayerProps) {
    return (
        <>
            {visitors
                .filter((visitor) => {
                    if (visitor.visitorId === currentVisitorId) return false;
                    if (currentGameId && visitor.inGame === currentGameId) return false;
                    return true;
                })
                .map((visitor) => {
                    const isInDifferentGame = Boolean(visitor.inGame && visitor.inGame !== currentGameId);
                    return (
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
                            dimmed={isInDifferentGame}
                        />
                    );
                })}
        </>
    );
}
