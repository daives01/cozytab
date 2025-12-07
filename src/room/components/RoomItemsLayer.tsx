import { ItemNode } from "../ItemNode";
import { MusicPlayerButtons } from "../MusicPlayerButtons";
import { isMusicItem } from "../roomUtils";
import type { RoomItem } from "../../types";
import { PresenceLayer } from "./PresenceLayer";
import type { VisitorState } from "../../hooks/useWebSocketPresence";
import type { OnboardingStep } from "../Onboarding";

type Mode = "view" | "edit";

interface RoomItemsLayerProps {
    items: RoomItem[];
    selectedId: string | null;
    mode: Mode;
    scale: number;
    onSelect: (id: string | null) => void;
    onChange: (next: RoomItem) => void;
    onDragStart: (id: string) => void;
    onDragEnd: () => void;
    onComputerClick: () => void;
    onMusicPlayerClick: (id: string) => void;
    bringItemToFront: (id: string) => void;
    sendItemToBack: (id: string) => void;
    onboardingStep: OnboardingStep | null;
    handleMusicToggle: (id: string, playing: boolean) => void;
    musicAutoplay: { itemId: string; token: string } | null;
    presenceRoomId: string | null;
    visitors: VisitorState[];
    visitorId: string | null;
    isGuest: boolean;
}

export function RoomItemsLayer({
    items,
    selectedId,
    mode,
    scale,
    onSelect,
    onChange,
    onDragStart,
    onDragEnd,
    onComputerClick,
    onMusicPlayerClick,
    bringItemToFront,
    sendItemToBack,
    onboardingStep,
    handleMusicToggle,
    musicAutoplay,
    presenceRoomId,
    visitors,
    visitorId,
    isGuest,
}: RoomItemsLayerProps) {
    return (
        <>
            {items.map((item, index) => {
                const isAtBack = index === 0;
                const isAtFront = index === items.length - 1;

                return (
                    <ItemNode
                        key={item.id}
                        item={item}
                        isSelected={item.id === selectedId}
                        mode={mode}
                        scale={scale}
                        onSelect={() => onSelect(item.id)}
                        onChange={onChange}
                        onDragStart={() => onDragStart(item.id)}
                        onDragEnd={onDragEnd}
                        onComputerClick={onComputerClick}
                        onMusicPlayerClick={() => onMusicPlayerClick(item.id)}
                        onBringToFront={() => bringItemToFront(item.id)}
                        onSendToBack={() => sendItemToBack(item.id)}
                        canBringToFront={!isAtFront}
                        canSendToBack={!isAtBack}
                        isOnboardingComputerTarget={onboardingStep === "click-computer"}
                        overlay={
                            isMusicItem(item) ? (
                                <MusicPlayerButtons
                                    key={`music-${item.id}-${item.musicUrl ?? "none"}`}
                                    item={item}
                                    onToggle={(playing) => handleMusicToggle(item.id, playing)}
                                    autoPlayToken={
                                        musicAutoplay && musicAutoplay.itemId === item.id ? musicAutoplay.token : null
                                    }
                                />
                            ) : null
                        }
                    />
                );
            })}

            {!isGuest && presenceRoomId && (
                <PresenceLayer visitors={visitors} currentVisitorId={visitorId} scale={scale} />
            )}
        </>
    );
}
