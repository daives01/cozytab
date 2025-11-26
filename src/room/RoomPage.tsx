import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useEffect, useState, type DragEvent, useRef } from "react";
import type { RoomItem } from "../types";
import { OnboardingModal } from "./OnboardingModal";
import { ItemNode } from "./ItemNode";
import { AssetDrawer } from "./AssetDrawer";
import { Button } from "@/components/ui/button";
import { SignInButton } from "@clerk/clerk-react";
import { Pencil, Eye, LogIn } from "lucide-react";

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
    const [showOnboarding, setShowOnboarding] = useState(!isGuest);
    const [isDrawerOpen, setIsDrawerOpen] = useState(true);
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
            } else if (room && localItems.length === 0) {
                setLocalItems(room.items as RoomItem[]);
            }
        }
    }, [room, createRoom, localItems.length, isGuest]);

    const backgroundTheme = room?.backgroundTheme || "light";

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

            {/* Top Bar - z-50 */}
            <div className="absolute top-4 left-4 right-4 flex justify-between items-start pointer-events-none" style={{ zIndex: 50 }}>
                <div className="bg-background/90 backdrop-blur-sm px-6 py-3 rounded-2xl shadow-lg border-2 border-border transform -rotate-1 pointer-events-auto">
                    <h1 className="text-3xl font-bold text-foreground tracking-wide">Nook</h1>
                </div>

                <div className="flex gap-3 pointer-events-auto">
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
                                size="lg"
                                variant={mode === "view" ? "default" : "secondary"}
                                className="font-bold text-lg shadow-lg transition-all"
                                onClick={() => {
                                    if (mode === "edit") {
                                        saveRoom({ roomId: room!._id, items: localItems });
                                        setMode("view");
                                    } else {
                                        setMode("edit");
                                        setIsDrawerOpen(true);
                                    }
                                }}
                            >
                                {mode === "view" ? (
                                    <>
                                        <Pencil className="mr-2 h-5 w-5" />
                                        Edit
                                    </>
                                ) : (
                                    <>
                                        <Eye className="mr-2 h-5 w-5" />
                                        View
                                    </>
                                )}
                            </Button>
                        </>
                    )}
                </div>
            </div>

            {/* Asset Drawer - z-50 */}
            {mode === "edit" && (
                <AssetDrawer
                    isOpen={isDrawerOpen}
                    onOpenChange={setIsDrawerOpen}
                    onDragStart={(e, id) => {
                        e.dataTransfer.setData("catalogItemId", id);
                    }}
                />
            )}

            {/* Onboarding - z-100 */}
            {showOnboarding && !isGuest && (
                <div className="absolute inset-0" style={{ zIndex: 100 }}>
                    <OnboardingModal onClose={() => setShowOnboarding(false)} />
                </div>
            )}
        </div>
    );
}
