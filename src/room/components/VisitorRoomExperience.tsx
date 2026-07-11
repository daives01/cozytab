import type React from "react";
import { GUEST_STARTING_COINS } from "@shared/guestTypes";
import { ChatInput } from "../ChatInput";
import { MobileChatInput } from "./MobileChatInput";
import { LocalCursor } from "@/presence/LocalCursor";
import { TouchCursor } from "./TouchCursor";
import { useTouchOnly } from "@/hooks/useTouchCapability";
import { ComputerOverlay } from "@/computer/ComputerOverlay";
import { GameOverlay } from "@/games/components/GameOverlay";
import { VisitorMusicModal } from "@/musicPlayer/VisitorMusicModal";
import { VisitorRoomItems } from "./VisitorRoomItems";
import { VisitorHeader } from "./VisitorHeader";
import { ConnectionBanner } from "./ConnectionBanner";
import { RoomExperience } from "./RoomExperience";
import { visibleComputerVisitors, type VisitorRoomController } from "../hooks/useVisitorRoomController";

interface VisitorRoomExperienceProps {
    controller: VisitorRoomController;
    extraOverlays?: React.ReactNode;
    zoomLevel?: number;
    panOffset?: { x: number; y: number };
    onPointerMove?: (event: React.PointerEvent) => void;
    onPointerDown?: (event: React.PointerEvent) => void;
    onPointerUp?: (event: React.PointerEvent) => void;
}

export function VisitorRoomExperience({
    controller,
    extraOverlays,
    zoomLevel,
    panOffset,
    onPointerMove,
    onPointerDown,
    onPointerUp,
}: VisitorRoomExperienceProps) {
    const touchOnly = useTouchOnly();
    const { source, identity, music, game, presence, cursor, economy } = controller;
    const roomContent = (
        <VisitorRoomItems
            items={source.room.items}
            catalogItems={controller.catalogItems}
            visitorMusicState={music.visitorMusicState}
            scale={controller.scale}
            onComputerClick={() => controller.setIsComputerOpen(true)}
            onMusicPlayerClick={music.setActiveMusicItemId}
            onGameClick={game.setActiveGameItemId}
            onMusicToggle={music.handleMusicToggle}
            visitors={presence.visitors}
            currentVisitorId={identity.id}
            currentGameId={game.activeGameItemId}
        />
    );
    const overlays = (
        <>
            <VisitorHeader ownerName={source.ownerName} visitorCount={presence.visitors.length} />
            <ConnectionBanner connectionState={presence.connectionState} connectionError={presence.connectionError} />
            {extraOverlays}
            {!touchOnly ? (
                <ChatInput onMessageChange={presence.updateChatMessage} disabled={presence.connectionState !== "connected"} />
            ) : (
                <MobileChatInput onMessageChange={presence.updateChatMessage} disabled={presence.connectionState !== "connected"} />
            )}
            {music.activeMusicItem ? (
                <VisitorMusicModal item={music.activeMusicItem} onClose={() => music.setActiveMusicItemId(null)} />
            ) : null}
            <GameOverlay
                isOpen={!!game.activeGameItemId && !!game.activeGameType}
                gameType={game.activeGameType ?? "chess"}
                itemId={game.activeGameItemId ?? ""}
                visitorId={identity.id}
                visitors={presence.visitors}
                setGameMetadata={presence.setGameMetadata}
                onClose={() => game.setActiveGameItemId(null)}
                onPointerMove={cursor.updateCursorFromClient}
                onGameActiveChange={game.handleGameActiveChange}
            />
            <LocalCursor
                x={presence.screenCursor.x}
                y={presence.screenCursor.y}
                chatMessage={presence.localChatMessage}
                cursorColor={identity.cursorColor}
            />
            <TouchCursor cursorColor={identity.cursorColor} />
            <ComputerOverlay
                isGuest={controller.isGuest}
                isComputerOpen={controller.isComputerOpen}
                onCloseComputer={() => controller.setIsComputerOpen(false)}
                shortcuts={controller.shortcuts}
                onUpdateShortcuts={controller.updateShortcuts}
                userCurrency={economy.currency}
                nextRewardAt={economy.nextRewardAt}
                loginStreak={economy.loginStreak}
                onPointerMove={cursor.updateCursorFromClient}
                guestCoins={economy.guestCoins}
                onGuestCoinsChange={economy.onGuestCoinsChange}
                startingCoins={GUEST_STARTING_COINS}
                guestInventory={economy.guestInventory}
                onGuestPurchase={economy.onGuestPurchase}
                isOnboardingShopStep={false}
                displayName={controller.isGuest ? undefined : identity.name}
                username={controller.isGuest ? undefined : identity.username ?? "you"}
                onDisplayNameUpdated={controller.setDisplayNameOverride}
                cursorColor={identity.cursorColor}
                onCursorColorChange={controller.updateCursorColor}
                timeOfDay={controller.timeOfDay}
                devTimeOfDay={controller.overrideTimeOfDay}
                onSetDevTimeOfDay={controller.setOverrideTimeOfDay}
                inRoomVisitors={visibleComputerVisitors(presence.visitors, identity.id)}
            />
        </>
    );

    return (
        <RoomExperience
            roomBackgroundImageUrl={controller.roomBackgroundImageUrl ?? undefined}
            scale={controller.scale}
            zoomLevel={zoomLevel}
            panOffset={panOffset}
            timeOfDay={controller.timeOfDay}
            containerRef={controller.containerRef}
            onMouseMove={cursor.handleMouseEvent}
            onMouseEnter={cursor.handleMouseEvent}
            onPointerMove={onPointerMove}
            onPointerDown={onPointerDown}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            roomContent={roomContent}
            overlays={overlays}
        />
    );
}
