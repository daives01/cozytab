import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { useParams, Link } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import type { RoomItem } from "../types";
import { ItemNode } from "./ItemNode";
import { MusicPlayerButtons } from "./MusicPlayerButtons";
import { PresenceCursor } from "./PresenceCursor";
import { LocalCursor } from "./LocalCursor";
import { useWebSocketPresence } from "../hooks/useWebSocketPresence";
import { ChatInput } from "./ChatInput";
import { Button } from "@/components/ui/button";
import { Home, Users } from "lucide-react";
import houseBackground from "../assets/house.png";

// Hook to resolve storage URLs for background images
function useResolvedBackgroundUrl(backgroundUrl: string | undefined) {
    const isStorageUrl = backgroundUrl?.startsWith("storage:");
    const storageId = isStorageUrl ? backgroundUrl?.replace("storage:", "") : null;
    const resolvedUrl = useQuery(
        api.catalog.getImageUrl,
        storageId ? { storageId: storageId as Id<"_storage"> } : "skip"
    );

    if (!backgroundUrl) return houseBackground; // fallback
    if (isStorageUrl) return resolvedUrl ?? undefined;
    return backgroundUrl;
}

const ROOM_WIDTH = 1920;
const ROOM_HEIGHT = 1080;

const isMusicItem = (item: RoomItem) => Boolean(item.musicUrl && item.musicType);

export function VisitorRoomPage() {
    const { token } = useParams<{ token: string }>();
    const roomData = useQuery(api.rooms.getRoomByInvite, token ? { token } : "skip");

    const [scale, setScale] = useState(1);
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

    useEffect(() => {
        const handleResize = () => {
            const windowWidth = window.innerWidth;
            const windowHeight = window.innerHeight;

            const scaleX = windowWidth / ROOM_WIDTH;
            const scaleY = windowHeight / ROOM_HEIGHT;

            const newScale = Math.max(scaleX, scaleY);
            setScale(newScale);
        };

        window.addEventListener("resize", handleResize);
        handleResize();

        return () => window.removeEventListener("resize", handleResize);
    }, []);

    useEffect(() => {
        const root = document.documentElement;
        root.classList.add("cozy-cursor-root");

        const handlePointerDown = () => {
            root.classList.add("cozy-cursor-click");
        };
        const handlePointerUp = () => {
            root.classList.remove("cozy-cursor-click");
            root.classList.remove("cozy-cursor-drag");
        };
        const handleDragStart = () => {
            root.classList.add("cozy-cursor-drag");
        };
        const handleDragEnd = () => {
            root.classList.remove("cozy-cursor-drag");
            root.classList.remove("cozy-cursor-click");
        };

        window.addEventListener("pointerdown", handlePointerDown);
        window.addEventListener("pointerup", handlePointerUp);
        window.addEventListener("dragstart", handleDragStart);
        window.addEventListener("dragend", handleDragEnd);

        return () => {
            root.classList.remove("cozy-cursor-root");
            root.classList.remove("cozy-cursor-click");
            root.classList.remove("cozy-cursor-drag");
            window.removeEventListener("pointerdown", handlePointerDown);
            window.removeEventListener("pointerup", handlePointerUp);
            window.removeEventListener("dragstart", handleDragStart);
            window.removeEventListener("dragend", handleDragEnd);
        };
    }, []);

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
    const musicItems = items.filter(isMusicItem);

    return (
        <div
            className="relative w-screen h-screen overflow-hidden font-['Patrick_Hand'] bg-black flex items-center justify-center cozy-cursor"
            onMouseMove={handleMouseEvent}
            onMouseEnter={handleMouseEvent}
        >
            <div
                ref={containerRef}
                style={{
                    width: ROOM_WIDTH,
                    height: ROOM_HEIGHT,
                    transform: `scale(${scale})`,
                    transformOrigin: "center",
                    position: "relative",
                    flexShrink: 0,
                }}
            >
                <div
                    className="absolute inset-0"
                    style={{
                        backgroundImage: backgroundUrl ? `url('${backgroundUrl}')` : undefined,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                        backgroundRepeat: "no-repeat",
                        backgroundColor: backgroundUrl ? undefined : "#1a1a1a",
                        zIndex: 0,
                    }}
                />

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
                    />
                ))}

                {musicItems.map((item) => (
                    <MusicPlayerButtons
                        key={`music-buttons-${item.id}`}
                        item={item}
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
                        />
                    ))}
            </div>

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
        </div>
    );
}
