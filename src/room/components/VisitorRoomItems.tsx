import type { RoomItem } from "@shared/guestTypes";
import type { Doc } from "@convex/_generated/dataModel";
import type { VisitorState } from "@/hooks/useWebSocketPresence";
import { ItemNode } from "../ItemNode";
import { MusicPlayerButtons } from "@/musicPlayer/MusicPlayerButtons";
import { MusicNotesOverlay } from "@/musicPlayer/MusicNotesOverlay";
import { ChessBoardPreviewOverlay } from "@/games/chess/ChessBoardPreviewOverlay";
import { PresenceLayer } from "@/presence/PresenceLayer";
import { isMusicItem } from "../roomUtils";
import { musicUrlKey } from "../hooks/useVisitorMusic";

type MusicState = {
    urlKey: string;
    playing: boolean;
    startedAt: number;
    positionAtStart: number;
};

interface VisitorRoomItemsProps {
    items: RoomItem[] | undefined;
    catalogItems: Doc<"catalogItems">[] | undefined;
    visitorMusicState: Record<string, MusicState>;
    scale: number;
    onComputerClick: () => void;
    onMusicPlayerClick: (itemId: string) => void;
    onGameClick: (itemId: string) => void;
    onMusicToggle: (itemId: string, playing: boolean, urlKey: string) => void;
    visitors: VisitorState[];
    currentVisitorId: string;
    currentGameId: string | null;
}

export function VisitorRoomItems({
    items,
    catalogItems,
    visitorMusicState,
    scale,
    onComputerClick,
    onMusicPlayerClick,
    onGameClick,
    onMusicToggle,
    visitors,
    currentVisitorId,
    currentGameId,
}: VisitorRoomItemsProps) {
    return (
        <>
            {items?.map((item) => {
                const musicState = visitorMusicState[item.id];
                const localMusicItem = musicState
                    ? {
                          ...item,
                          musicPlaying: musicState.playing,
                          musicStartedAt: musicState.startedAt,
                          musicPositionAtStart: musicState.positionAtStart,
                      }
                    : {
                          ...item,
                          musicPlaying: item.musicPlaying ?? false,
                          musicStartedAt: item.musicStartedAt ?? 0,
                          musicPositionAtStart: item.musicPositionAtStart ?? 0,
                      };
                const catalogItem = catalogItems?.find((c) => c._id === item.catalogItemId);

                return (
                    <ItemNode
                        key={item.id}
                        item={localMusicItem}
                        catalogItem={catalogItem}
                        isSelected={false}
                        mode="view"
                        scale={scale}
                        onSelect={() => {}}
                        onChange={() => {}}
                        onDragStart={() => {}}
                        onDragEnd={() => {}}
                        onComputerClick={onComputerClick}
                        onMusicPlayerClick={() => onMusicPlayerClick(item.id)}
                        onGameClick={() => onGameClick(item.id)}
                        isVisitor={true}
                        overlay={
                            isMusicItem(item) ? (
                                <>
                                    <MusicNotesOverlay playing={Boolean(localMusicItem.musicPlaying)} seed={item.id} />
                                    <MusicPlayerButtons
                                        key={item.id}
                                        item={localMusicItem}
                                        onToggle={(playing) => onMusicToggle(item.id, playing, musicUrlKey(item))}
                                        isVisitor={true}
                                    />
                                </>
                            ) : catalogItem?.gameType === "chess" ? (
                                <ChessBoardPreviewOverlay itemId={item.id} />
                            ) : null
                        }
                    />
                );
            })}

            <PresenceLayer
                visitors={visitors}
                currentVisitorId={currentVisitorId}
                scale={scale}
                currentGameId={currentGameId}
                items={items}
            />
        </>
    );
}
