import { ItemNode } from "../ItemNode";
import { MusicPlayerButtons } from "@/musicPlayer/MusicPlayerButtons";
import { MusicNotesOverlay } from "@/musicPlayer/MusicNotesOverlay";
import { ChessBoardPreviewOverlay } from "@/games/chess/ChessBoardPreviewOverlay";
import { isMusicItem } from "../roomUtils";
import type { RoomItem } from "@shared/guestTypes";
import type { Doc } from "@convex/_generated/dataModel";
import { PresenceLayer } from "@/presence/PresenceLayer";
import type { VisitorState } from "@/hooks/useWebSocketPresence";
import type { OnboardingStep } from "../Onboarding";

type Mode = "view" | "edit";

interface RoomItemsLayerProps {
    items: RoomItem[];
    catalogItems?: Doc<"catalogItems">[];
    selectedId: string | null;
    mode: Mode;
    scale: number;
    onSelect: (id: string | null) => void;
    onChange: (next: RoomItem) => void;
    onDragStart: (id: string) => void;
    onDragEnd: () => void;
    onComputerClick: () => void;
    onMusicPlayerClick: (id: string) => void;
    onGameClick: (id: string) => void;
    bringItemToFront: (id: string) => void;
    sendItemToBack: (id: string) => void;
    onboardingStep: OnboardingStep | null;
    handleMusicToggle: (id: string, playing: boolean) => void;
    musicInteractionToken: number;
    presenceRoomId: string | null;
    visitors: VisitorState[];
    visitorId: string | null;
    isGuest: boolean;
    currentGameId?: string | null;
}

export function RoomItemsLayer({
    items,
    catalogItems,
    selectedId,
    mode,
    scale,
    onSelect,
    onChange,
    onDragStart,
    onDragEnd,
    onComputerClick,
    onMusicPlayerClick,
    onGameClick,
    bringItemToFront,
    sendItemToBack,
    onboardingStep,
    handleMusicToggle,
    musicInteractionToken,
    presenceRoomId,
    visitors,
    visitorId,
    isGuest,
    currentGameId,
}: RoomItemsLayerProps) {
    return (
        <>
            {items.map((item, index) => {
                const isAtBack = index === 0;
                const isAtFront = index === items.length - 1;
                const catalogItem = catalogItems?.find((c) => c._id === item.catalogItemId);

                return (
                    <ItemNode
                        key={item.id}
                        item={item}
                        catalogItem={catalogItem}
                        isSelected={item.id === selectedId}
                        mode={mode}
                        scale={scale}
                        onSelect={() => onSelect(item.id)}
                        onChange={onChange}
                        onDragStart={() => onDragStart(item.id)}
                        onDragEnd={onDragEnd}
                        onComputerClick={onComputerClick}
                        onMusicPlayerClick={() => onMusicPlayerClick(item.id)}
                        onGameClick={() => onGameClick(item.id)}
                        onBringToFront={() => bringItemToFront(item.id)}
                        onSendToBack={() => sendItemToBack(item.id)}
                        canBringToFront={!isAtFront}
                        canSendToBack={!isAtBack}
                        isOnboardingComputerTarget={onboardingStep === "click-computer"}
                        overlay={
                            isMusicItem(item) ? (
                                <>
                                    <MusicNotesOverlay playing={Boolean(item.musicPlaying)} seed={item.id} />
                                    <MusicPlayerButtons
                                        key={item.id}
                                        item={item}
                                        onToggle={(playing) => handleMusicToggle(item.id, playing)}
                                        interactionGranted={musicInteractionToken > 0}
                                        isVisitor={false}
                                    />
                                </>
                            ) : catalogItem?.gameType === "chess" ? (
                                <ChessBoardPreviewOverlay
                                    itemId={item.id}
                                    width={catalogItem.defaultWidth}
                                />
                            ) : null
                        }
                    />
                );
            })}

            {!isGuest && presenceRoomId && (
                <PresenceLayer
                    visitors={visitors}
                    currentVisitorId={visitorId}
                    scale={scale}
                    currentGameId={currentGameId}
                    items={items}
                />
            )}
        </>
    );
}
