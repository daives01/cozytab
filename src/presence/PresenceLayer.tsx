import type { VisitorState } from "@/hooks/useWebSocketPresence";
import type { RoomItem } from "@/types";
import { PresenceCursor } from "./PresenceCursor";

interface PresenceLayerProps {
    visitors: VisitorState[];
    currentVisitorId: string | null;
    scale: number;
    currentGameId?: string | null;
    items?: RoomItem[];
}

export function PresenceLayer({
    visitors,
    currentVisitorId,
    scale,
    currentGameId,
    items,
}: PresenceLayerProps) {
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

                    let cursorX = visitor.x;
                    let cursorY = visitor.y;

                    if (visitor.inGame && items) {
                        const item = items.find((i) => i.id === visitor.inGame);
                        if (item) {
                            cursorX = item.x;
                            cursorY = item.y;
                        }
                    }

                    return (
                        <PresenceCursor
                            key={visitor.visitorId}
                            name={visitor.displayName}
                            isOwner={visitor.isOwner}
                            x={cursorX}
                            y={cursorY}
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
