import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useEffect, useState, type DragEvent, useRef } from "react";
import type { RoomItem } from "../types";
import { ItemNode } from "./ItemNode";
import { AssetDrawer } from "./AssetDrawer";
import { Button } from "@/components/ui/button";
import { SignInButton } from "@clerk/clerk-react";
import { Lock, LockOpen, LogIn, ChevronLeft, ChevronRight } from "lucide-react";

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

    const [mode, setMode] = useState<Mode>("view");
    const [localItems, setLocalItems] = useState<RoomItem[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [scale, setScale] = useState(1);
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

    useEffect(() => {
        if (!isGuest) {
            if (room === null) {
                createRoom();
            } else if (room) {
                // Always sync with server state in view mode
                // Or if we haven't loaded anything yet (initial load)
                if (mode === "view" || localItems.length === 0) {
                    setLocalItems(room.items as RoomItem[]);
                }
            }
        }
    }, [room, createRoom, isGuest, mode]); // Removed localItems.length, added mode

    const backgroundTheme = room?.backgroundTheme || "light";

    const handleDragOver = (e: DragEvent) => {
        e.preventDefault();
    };

    const handleDrop = (e: DragEvent) => {
        e.preventDefault();
        if (mode !== "edit") return;

        const catalogItemId = e.dataTransfer.getData("catalogItemId");
        const itemUrl = e.dataTransfer.getData("itemUrl");

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
            url: itemUrl || "",
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
            className="relative w-screen h-screen overflow-hidden font-['Patrick_Hand'] bg-black flex items-center justify-center"
            onDragOver={handleDragOver}
            onDrop={handleDrop}
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
                        backgroundColor: backgroundTheme === "dark" ? "#1a1a1a" : "#f8fafc",
                        zIndex: 0,
                    }}
                    onClick={() => setSelectedId(null)}
                />

                {/* Grid - z-1 */}
                {mode === "edit" && (
                    <svg
                        className="absolute inset-0 pointer-events-none"
                        style={{ zIndex: 1 }}
                    >
                        <defs>
                            <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
                                <path
                                    d="M 50 0 L 0 0 0 50"
                                    fill="none"
                                    stroke="#cbd5e1"
                                    strokeWidth="1"
                                    strokeDasharray="4,4"
                                />
                            </pattern>
                        </defs>
                        <rect width="100%" height="100%" fill="url(#grid)" />
                    </svg>
                )}

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
                    />
                ))}
            </div>

            {/* UI Elements (Unscaled, Screen-Relative) */}

            {/* Top Right Controls - z-50 */}
            <div className="absolute top-4 right-4 flex gap-3 pointer-events-auto items-center" style={{ zIndex: 50 }}>
                {isGuest ? (
                    <SignInButton mode="modal">
                        <Button size="lg" className="font-bold text-lg shadow-lg">
                            <LogIn className="mr-2 h-5 w-5" />
                            Login
                        </Button>
                    </SignInButton>
                ) : (
                    <>
                        <Button
                            size="icon"
                            variant={mode === "view" ? "secondary" : "default"}
                            className="h-12 w-12 rounded-full shadow-lg transition-all"
                            onClick={() => {
                                if (mode === "edit") {
                                    // Lock it (Save & View)
                                    saveRoom({ roomId: room!._id, items: localItems });
                                    setMode("view");
                                    setIsDrawerOpen(false);
                                } else {
                                    // Unlock it (Edit)
                                    setMode("edit");
                                    setIsDrawerOpen(true);
                                }
                            }}
                        >
                            {mode === "view" ? (
                                <Lock className="h-6 w-6" />
                            ) : (
                                <LockOpen className="h-6 w-6" />
                            )}
                        </Button>
                    </>
                )}
            </div>

            {/* Drawer Toggle Button - Only in Edit Mode */}
            {mode === "edit" && (
                <div
                    className="absolute right-0 top-1/2 transform -translate-y-1/2 z-50 transition-all duration-300"
                    style={{ right: isDrawerOpen ? "140px" : "0" }}
                >
                    <Button
                        size="icon"
                        variant="secondary"
                        className="h-12 w-8 rounded-l-xl rounded-r-none shadow-lg border-y border-l border-border"
                        onClick={() => setIsDrawerOpen(!isDrawerOpen)}
                    >
                        {isDrawerOpen ? (
                            <ChevronRight className="h-6 w-6" />
                        ) : (
                            <ChevronLeft className="h-6 w-6" />
                        )}
                    </Button>
                </div>
            )}

            {/* Asset Drawer - z-40 */}
            {mode === "edit" && (
                <AssetDrawer
                    isOpen={isDrawerOpen}
                    onDragStart={(e: React.DragEvent, id: string, url: string) => {
                        e.dataTransfer.setData("catalogItemId", id);
                        e.dataTransfer.setData("itemUrl", url);
                    }}
                />
            )}
        </div>
    );
}
