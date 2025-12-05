import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useParams, Link } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import type { RoomItem } from "../types";
import { ItemNode } from "./ItemNode";
import { MusicPlayerButtons } from "./MusicPlayerButtons";
import { PresenceCursor } from "./PresenceCursor";
import { LocalCursor } from "./LocalCursor";
import { useWebSocketPresence } from "../hooks/useWebSocketPresence";
import { ChatInput } from "./ChatInput";
import { Button } from "@/components/ui/button";
import { Home, Users } from "lucide-react";
import { RoomCanvas } from "./RoomCanvas";
import { useResolvedBackgroundUrl } from "./hooks/useResolvedBackgroundUrl";
import { useRoomScale } from "./hooks/useRoomScale";
import { useCozyCursor } from "./hooks/useCozyCursor";
import { ROOM_HEIGHT, ROOM_WIDTH } from "./roomConstants";
import { isMusicItem } from "./roomUtils";
import { getReferralCode, saveReferralCode } from "../referralStorage";

const nowTimestamp = () => Date.now();

export function VisitorRoomPage() {
    const { token } = useParams<{ token: string }>();
    const roomData = useQuery(api.rooms.getRoomByInvite, token ? { token } : "skip");
    const updateMusicState = useMutation(api.rooms.updateMusicState);

    const scale = useRoomScale(ROOM_WIDTH, ROOM_HEIGHT);
    const containerRef = useRef<HTMLDivElement>(null);

    const [visitorId] = useState(() => `visitor-${crypto.randomUUID()}`);
    const [visitorName] = useState(() => `Visitor ${Math.floor(Math.random() * 1000)}`);

    const { visitors, updateCursor, updateChatMessage, screenCursor, localChatMessage } = useWebSocketPresence(
        roomData?.room?._id ?? null,
        visitorId,
        visitorName,
        false
    );
    const backgroundUrl = useResolvedBackgroundUrl(roomData?.room?.template?.backgroundUrl);
    useCozyCursor(true);

    useEffect(() => {
        const ownerReferralCode = roomData?.ownerReferralCode;
        if (!ownerReferralCode) return;

        const existingCode = getReferralCode();
        if (!existingCode) {
            saveReferralCode(ownerReferralCode);
        }
    }, [roomData?.ownerReferralCode]);

    const handleMusicToggle = (itemId: string, playing: boolean) => {
        if (!roomData?.room?._id) return;
        updateMusicState({
            roomId: roomData.room._id,
            itemId,
            musicPlaying: playing,
            musicStartedAt: playing ? nowTimestamp() : 0,
            musicPositionAtStart: 0,
        });
    };

    const handleMouseEvent = (e: React.MouseEvent) => {
        if (!containerRef.current) return;

        const rect = containerRef.current.getBoundingClientRect();
        const roomX = (e.clientX - rect.left) / scale;
        const roomY = (e.clientY - rect.top) / scale;
        updateCursor(roomX, roomY, e.clientX, e.clientY);
    };

    if (!token) {
        return (
            <div className="h-screen w-screen flex flex-col items-center justify-center font-['Patrick_Hand'] text-xl gap-4">
                <p>Invalid invite link</p>
                <Link to="/">
                    <Button>
                        <Home className="mr-2 h-4 w-4" />
                        Go Home
                    </Button>
                </Link>
            </div>
        );
    }

    if (roomData === undefined) {
        return (
            <div className="h-screen w-screen flex items-center justify-center font-['Patrick_Hand'] text-xl">
                Loading room...
            </div>
        );
    }

    if (roomData === null) {
        return (
            <div className="h-screen w-screen flex flex-col items-center justify-center font-['Patrick_Hand'] text-xl gap-4">
                <p>This invite link is invalid or has expired</p>
                <Link to="/">
                    <Button>
                        <Home className="mr-2 h-4 w-4" />
                        Go Home
                    </Button>
                </Link>
            </div>
        );
    }

    const items = roomData.room.items as RoomItem[];

    const roomContent = (
        <>
            {items.map((item) => (
                <ItemNode
                    key={item.id}
                    item={item}
                    isSelected={false}
                    mode="view"
                    scale={scale}
                    onSelect={() => { }}
                    onChange={() => { }}
                    onDragStart={() => { }}
                    onDragEnd={() => { }}
                    onComputerClick={() => { }}
                    onMusicPlayerClick={() => { }}
                    isVisitor={true}
                    overlay={
                        isMusicItem(item) ? (
                            <MusicPlayerButtons
                                key={`music-${item.id}-${item.musicUrl ?? "none"}`}
                                item={item}
                                onToggle={(playing) => handleMusicToggle(item.id, playing)}
                            />
                        ) : null
                    }
                />
            ))}

            {visitors
                .filter((v) => v.visitorId !== visitorId)
                .map((visitor) => (
                    <PresenceCursor
                        key={visitor.visitorId}
                        name={visitor.displayName}
                        isOwner={visitor.isOwner}
                        x={visitor.x}
                        y={visitor.y}
                        chatMessage={visitor.chatMessage}
                        scale={scale}
                    />
                ))}
        </>
    );

    const overlays = (
        <>
            <div className="absolute top-4 left-4 flex gap-3 pointer-events-auto items-center" style={{ zIndex: 50 }}>
                <div className="bg-[var(--paper)] backdrop-blur-sm rounded-xl px-4 py-2 shadow-md border-2 border-[var(--ink)]">
                    <div className="text-sm text-[var(--ink-subtle)] uppercase tracking-wide text-xs">Visiting</div>
                    <div className="font-bold text-lg text-[var(--ink)]">{roomData.ownerName}'s Room</div>
                </div>
            </div>

            <div className="absolute top-4 right-4 flex gap-3 pointer-events-auto items-center" style={{ zIndex: 50 }}>
                {visitors.length > 1 && (
                    <div className="bg-[var(--paper)] backdrop-blur-sm rounded-xl px-3 py-2 shadow-md border-2 border-[var(--ink)] flex items-center gap-2">
                        <Users className="h-4 w-4 text-[var(--ink)]" />
                        <span className="font-bold text-[var(--ink)]">{visitors.length}</span>
                    </div>
                )}
                <Link to="/">
                    <Button variant="outline" className="bg-[var(--paper)] backdrop-blur-sm shadow-md">
                        <Home className="mr-2 h-4 w-4" />
                        My Room
                    </Button>
                </Link>
            </div>

            <ChatInput onMessageChange={updateChatMessage} />

            <div className="absolute bottom-4 left-4 z-50 pointer-events-none">
                <div className="bg-[var(--ink)]/80 text-white text-sm px-3 py-1.5 rounded-lg backdrop-blur-sm border-2 border-[var(--ink)] shadow-sm">
                    <span className="font-mono bg-[var(--ink-light)] px-1.5 py-0.5 rounded text-xs mr-1.5">/</span>
                    <span style={{ fontFamily: "'Patrick Hand', cursive" }}>to chat</span>
                </div>
            </div>

            <LocalCursor
                x={screenCursor.x}
                y={screenCursor.y}
                chatMessage={localChatMessage}
            />
        </>
    );

    return (
        <RoomCanvas
            backgroundUrl={backgroundUrl}
            scale={scale}
            containerRef={containerRef}
            onMouseMove={handleMouseEvent}
            onMouseEnter={handleMouseEvent}
            roomContent={roomContent}
            overlays={overlays}
        />
    );
}
