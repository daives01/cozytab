import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { useEffect, useState, type DragEvent, useRef } from "react";
import type { RoomItem, Shortcut } from "../types";
import { ItemNode } from "./ItemNode";
import { AssetDrawer } from "./AssetDrawer";
import { TrashCan } from "./TrashCan";
import { ComputerScreen } from "./ComputerScreen";
import { MusicPlayerModal } from "./MusicPlayerModal";
import { InlineMusicPlayer } from "./InlineMusicPlayer";
import { MusicPlayerButtons } from "./MusicPlayerButtons";
import { Button } from "@/components/ui/button";
import { SignInButton } from "@clerk/clerk-react";
import { Lock, LockOpen, LogIn, ChevronLeft, ChevronRight } from "lucide-react";
import { debounce } from "@/lib/debounce";

type Mode = "view" | "edit";

interface RoomPageProps {
    isGuest?: boolean;
}

const ROOM_WIDTH = 1920;
const ROOM_HEIGHT = 1080;

export function RoomPage({ isGuest = false }: RoomPageProps) {
    const room = useQuery(api.rooms.getMyRoom, isGuest ? "skip" : {});
    const createRoom = useMutation(api.rooms.createRoom);
    const saveRoom = useMutation(api.rooms.saveMyRoom);
    const saveShortcuts = useMutation(api.rooms.saveShortcuts);

    const [mode, setMode] = useState<Mode>("view");
    const [localItems, setLocalItems] = useState<RoomItem[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [scale, setScale] = useState(1);
    const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
    const [isComputerOpen, setIsComputerOpen] = useState(false);
    const [localShortcuts, setLocalShortcuts] = useState<Shortcut[]>([]);
    const [musicPlayerItemId, setMusicPlayerItemId] = useState<string | null>(null);
    // Track playing state for each music player item (keyed by item ID)
    const [musicPlayerStates, setMusicPlayerStates] = useState<Record<string, boolean>>({});
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleResize = () => {
            const windowWidth = window.innerWidth;
            const windowHeight = window.innerHeight;

            const scaleX = windowWidth / ROOM_WIDTH;
            const scaleY = windowHeight / ROOM_HEIGHT;

            // Use Math.max to cover the screen (no black bars)
            const newScale = Math.max(scaleX, scaleY);
            setScale(newScale);
        };

        window.addEventListener("resize", handleResize);
        handleResize(); // Initial calculation

        return () => window.removeEventListener("resize", handleResize);
    }, []);

    // Debounced save function
    const debouncedSaveRef = useRef<ReturnType<typeof debounce<(...args: Parameters<typeof saveRoom>) => void>> | null>(null);
    
    useEffect(() => {
        debouncedSaveRef.current = debounce((roomId: Id<"rooms">, items: RoomItem[]) => {
            saveRoom({ roomId, items });
        }, 1000); // 1 second debounce
    }, [saveRoom]);

    useEffect(() => {
        if (!isGuest) {
            if (room === null) {
                createRoom();
            } else if (room) {
                // Always sync with server state in view mode
                // Or if we haven't loaded anything yet (initial load)
                if (mode === "view" || localItems.length === 0) {
                    // eslint-disable-next-line react-hooks/set-state-in-effect
                    setLocalItems(room.items as RoomItem[]);
                }
                // Sync shortcuts
                if (room.shortcuts) {
                    setLocalShortcuts(room.shortcuts as Shortcut[]);
                } else {
                    setLocalShortcuts([]);
                }
            }
        }
    }, [room, createRoom, isGuest, mode, localItems.length]); // Added localItems.length back for proper dependency

    // Auto-save when items change in edit mode
    useEffect(() => {
        if (mode === "edit" && room && debouncedSaveRef.current) {
            debouncedSaveRef.current(room._id, localItems);
        }
    }, [localItems, mode, room]);

    const handleDragOver = (e: DragEvent) => {
        e.preventDefault();
    };

    const handleDrop = (e: DragEvent) => {
        e.preventDefault();
        if (mode !== "edit") return;

        const catalogItemId = e.dataTransfer.getData("catalogItemId");
        if (!catalogItemId) return;

        if (!containerRef.current) return;

        const rect = containerRef.current.getBoundingClientRect();

        // Mouse position relative to the container (top-left of container)
        const relativeX = e.clientX - rect.left;
        const relativeY = e.clientY - rect.top;

        // Convert to unscaled coordinates
        const x = relativeX / scale;
        const y = relativeY / scale;

        const newItem: RoomItem = {
            id: crypto.randomUUID(),
            catalogItemId: catalogItemId,
            x: x,
            y: y,
            scaleX: 1,
            scaleY: 1,
            rotation: 0,
            zIndex: 10,
            url: "",
        };

        setLocalItems((prev) => [...prev, newItem]);
    };

    if (!isGuest && !room) {
        return (
            <div className="h-screen w-screen flex items-center justify-center font-['Patrick_Hand'] text-xl">
                Loading your nook...
            </div>
        );
    }

    return (
        <div
            className={`relative w-screen h-screen overflow-hidden font-['Patrick_Hand'] bg-black flex items-center justify-center ${
                draggedItemId ? "select-none" : ""
            }`}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onSelectStart={(e) => {
                // Prevent text selection during drag operations
                if (draggedItemId) {
                    e.preventDefault();
                }
            }}
        >
            {/* Scaled Room Container */}
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
                {/* Background - z-0 */}
                <div
                    className="absolute inset-0"
                    style={{
                        backgroundImage: "url('/src/assets/house.png')",
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                        backgroundRepeat: "no-repeat",
                        zIndex: 0,
                    }}
                    onClick={() => setSelectedId(null)}
                />

                {/* Items - z-10 */}
                {localItems.map((item) => (
                    <ItemNode
                        key={item.id}
                        item={item}
                        isSelected={item.id === selectedId}
                        mode={mode}
                        scale={scale}
                        onSelect={() => {
                            setSelectedId(item.id)
                        }}
                        onChange={(newItem) => {
                            setLocalItems((prev) =>
                                prev.map((i) => (i.id === newItem.id ? newItem : i))
                            );
                        }}
                        onDragStart={() => setDraggedItemId(item.id)}
                        onDragEnd={() => setDraggedItemId(null)}
                        onComputerClick={() => {
                            if (!isGuest && mode === "view") {
                                setIsComputerOpen(true);
                            }
                        }}
                        onMusicPlayerClick={() => {
                            if (!isGuest && mode === "view") {
                                setMusicPlayerItemId(item.id);
                            }
                        }}
                    />
                ))}

                {/* Inline Music Players - z-11 */}
                {localItems
                    .filter((item) => item.musicUrl && item.musicType)
                    .map((item) => (
                        <InlineMusicPlayer
                            key={`music-${item.id}`}
                            item={item}
                            scale={scale}
                            isPlaying={musicPlayerStates[item.id] ?? false}
                            onPlayingChange={(playing) => {
                                setMusicPlayerStates((prev) => ({
                                    ...prev,
                                    [item.id]: playing,
                                }));
                            }}
                            onChange={(updatedItem) => {
                                setLocalItems((prev) =>
                                    prev.map((i) => (i.id === updatedItem.id ? updatedItem : i))
                                );
                            }}
                        />
                    ))}

                {/* Music Player Buttons (when video is hidden) - z-11 */}
                {localItems
                    .filter((item) => item.musicUrl && item.musicType && item.videoVisible === false)
                    .map((item) => (
                        <MusicPlayerButtons
                            key={`music-buttons-${item.id}`}
                            item={item}
                            scale={scale}
                            isPlaying={musicPlayerStates[item.id] ?? false}
                            onPlayingChange={(playing) => {
                                setMusicPlayerStates((prev) => ({
                                    ...prev,
                                    [item.id]: playing,
                                }));
                            }}
                            onChange={(updatedItem) => {
                                setLocalItems((prev) =>
                                    prev.map((i) => (i.id === updatedItem.id ? updatedItem : i))
                                );
                            }}
                        />
                    ))}
            </div>

            {/* UI Elements (Unscaled, Screen-Relative) */}

            {/* Top Left Controls - z-50 */}
            <div className="absolute top-4 left-4 flex gap-3 pointer-events-auto items-center" style={{ zIndex: 50 }}>
                {isGuest ? (
                    <SignInButton mode="modal">
                        <Button size="lg" className="font-bold text-lg shadow-lg">
                            <LogIn className="mr-2 h-5 w-5" />
                            Login
                        </Button>
                    </SignInButton>
                ) : (
                    <>
                        <div className="flex flex-col items-center gap-1">
                            <button
                                onClick={() => {
                                    if (mode === "edit") {
                                        setMode("view");
                                        setIsDrawerOpen(false);
                                    } else {
                                        setMode("edit");
                                        setIsDrawerOpen(true);
                                    }
                                }}
                                className={`
                                    relative h-14 w-14 rounded-full border-4 shadow-[0_4px_0_rgba(0,0,0,0.2)] active:shadow-none active:translate-y-[4px] transition-all
                                    flex items-center justify-center
                                    ${mode === "view" 
                                        ? "bg-emerald-400 border-emerald-600 text-emerald-900" 
                                        : "bg-amber-400 border-amber-600 text-amber-900"
                                    }
                                `}
                            >
                                {mode === "view" ? (
                                    <Lock className="h-7 w-7" />
                                ) : (
                                    <LockOpen className="h-7 w-7" />
                                )}
                            </button>
                            <span className="font-['Patrick_Hand'] text-white text-lg font-bold drop-shadow-md select-none">
                                {mode === "view" ? "View" : "Edit"}
                            </span>
                        </div>
                    </>
                )}
            </div>

            {/* Drawer Toggle Button - Only in Edit Mode */}
            {mode === "edit" && (
                <div
                    className="absolute top-1/2 transform -translate-y-1/2 z-50 transition-all duration-300"
                    style={{ right: isDrawerOpen ? "180px" : "20px" }}
                >
                    <button
                        onClick={() => setIsDrawerOpen(!isDrawerOpen)}
                        className="bg-[#c7b299] hover:bg-[#b5a18b] text-[#5c4d3c] h-16 w-8 rounded-l-lg border-y-4 border-l-4 border-[#a6927d] shadow-lg flex items-center justify-center transition-colors outline-none active:scale-95"
                    >
                        {isDrawerOpen ? (
                            <ChevronRight className="h-6 w-6" />
                        ) : (
                            <ChevronLeft className="h-6 w-6" />
                        )}
                    </button>
                </div>
            )}

            {/* Asset Drawer - z-40 */}
            {mode === "edit" && (
                <AssetDrawer
                    isOpen={isDrawerOpen}
                    onDragStart={(e: React.DragEvent, id: string) => {
                        e.dataTransfer.setData("catalogItemId", id);
                    }}
                />
            )}

            {/* Trash Can - z-50 */}
            {mode === "edit" && (
                <TrashCan
                    draggedItemId={draggedItemId}
                    onDelete={(itemId) => {
                        setLocalItems((prev) => prev.filter((item) => item.id !== itemId));
                        setSelectedId((current) => current === itemId ? null : current);
                        // Don't clear draggedItemId here - let ItemNode's onDragEnd handle it
                    }}
                />
            )}

            {/* Computer Screen - z-100 */}
            {!isGuest && isComputerOpen && room && (
                <ComputerScreen
                    shortcuts={localShortcuts}
                    onClose={() => setIsComputerOpen(false)}
                    onUpdateShortcuts={(shortcuts) => {
                        setLocalShortcuts(shortcuts);
                        if (room) {
                            saveShortcuts({ roomId: room._id, shortcuts });
                        }
                    }}
                    onOpenShop={() => {
                        // TODO: Implement shop screen
                        alert("Shop coming soon!");
                    }}
                />
            )}

            {/* Music Player Modal - z-100 */}
            {!isGuest && musicPlayerItemId && room && (() => {
                const item = localItems.find((i) => i.id === musicPlayerItemId);
                return item ? (
                    <MusicPlayerModal
                        item={item}
                        onClose={() => setMusicPlayerItemId(null)}
                        onSave={(updatedItem) => {
                            const updatedItems = localItems.map((i) => (i.id === updatedItem.id ? updatedItem : i));
                            setLocalItems(updatedItems);
                            // Explicitly save to database (works in both view and edit mode)
                            saveRoom({ roomId: room._id, items: updatedItems });
                            
                            // Auto-play when music URL is set
                            if (updatedItem.musicUrl && updatedItem.musicType) {
                                setMusicPlayerStates((prev) => ({
                                    ...prev,
                                    [updatedItem.id]: true,
                                }));
                            } else {
                                // Stop playing if music is cleared
                                setMusicPlayerStates((prev) => ({
                                    ...prev,
                                    [updatedItem.id]: false,
                                }));
                            }
                            
                            setMusicPlayerItemId(null);
                        }}
                    />
                ) : null;
            })()}
        </div>
    );
}
