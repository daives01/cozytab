import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useEffect, useState } from "react";
import type { RoomItem } from "../types";
import { SelectedItemPanel } from "./SelectedItemPanel";
import { ItemPalette } from "./ItemPalette";
import { OnboardingModal } from "./OnboardingModal";
import { ItemNode } from "./ItemNode";

type Mode = "view" | "edit";

export function RoomPage() {
    const room = useQuery(api.rooms.getMyRoom, {});
    const createRoom = useMutation(api.rooms.createRoom);
    const saveRoom = useMutation(api.rooms.saveMyRoom);

    const [mode, setMode] = useState<Mode>("view");
    const [localItems, setLocalItems] = useState<RoomItem[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [showOnboarding, setShowOnboarding] = useState(true);

    const selectedItem = localItems.find((i) => i.id === selectedId);

    useEffect(() => {
        if (room === null) {
            createRoom();
        } else if (room && localItems.length === 0) {
            setLocalItems(room.items as RoomItem[]);
        }
    }, [room, createRoom, localItems.length]);

    if (!room) {
        return (
            <div className="h-screen w-screen flex items-center justify-center font-['Patrick_Hand'] text-xl">
                Loading your nook...
            </div>
        );
    }

    return (
        <div className="relative w-screen h-screen overflow-hidden font-['Patrick_Hand']">
            {/* Background - z-0 */}
            <div
                className="absolute inset-0"
                style={{
                    backgroundColor: room.backgroundTheme === "dark" ? "#1a1a1a" : "#f8fafc",
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
                    onSelect={() => setSelectedId(item.id)}
                    onChange={(newItem) => {
                        setLocalItems((prev) =>
                            prev.map((i) => (i.id === newItem.id ? newItem : i))
                        );
                    }}
                />
            ))}

            {/* Top Bar - z-50 */}
            <div className="absolute top-4 left-4 right-4 flex justify-between items-start" style={{ zIndex: 50 }}>
                <div className="bg-white/90 backdrop-blur-sm px-6 py-3 rounded-2xl shadow-lg border-2 border-gray-800 transform -rotate-1">
                    <h1 className="text-3xl font-bold text-gray-800 tracking-wide">Nook</h1>
                </div>

                <div className="flex gap-3">
                    <button
                        className={`px-6 py-3 rounded-xl font-bold text-lg border-2 border-gray-800 shadow-[4px_4px_0px_0px_rgba(31,41,55,1)] transition-all ${mode === "view"
                                ? "bg-blue-400 text-white hover:bg-blue-500"
                                : "bg-white text-gray-800 hover:bg-gray-50"
                            }`}
                        onClick={() => setMode((m) => (m === "view" ? "edit" : "view"))}
                    >
                        {mode === "view" ? "✎ Edit" : "👁 View"}
                    </button>

                    {mode === "edit" && (
                        <button
                            className="px-6 py-3 rounded-xl font-bold text-lg border-2 border-gray-800 shadow-[4px_4px_0px_0px_rgba(22,163,74,1)] bg-green-400 text-white hover:bg-green-500 transition-all"
                            onClick={async () => {
                                await saveRoom({ roomId: room._id, items: localItems });
                                setMode("view");
                            }}
                        >
                            ✓ Save
                        </button>
                    )}
                </div>
            </div>

            {/* Palette - z-50 */}
            {mode === "edit" && (
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-full max-w-4xl px-4" style={{ zIndex: 50 }}>
                    <ItemPalette
                        onAddItem={(newItem) => {
                            const item: RoomItem = {
                                id: crypto.randomUUID(),
                                catalogItemId: newItem.catalogItemId!,
                                x: window.innerWidth / 2,
                                y: window.innerHeight / 2,
                                scaleX: 1,
                                scaleY: 1,
                                rotation: 0,
                                zIndex: 10,
                                url: "",
                            };
                            setLocalItems((prev) => [...prev, item]);
                        }}
                    />
                </div>
            )}

            {/* Side Panel - z-50 */}
            {mode === "edit" && selectedItem && (
                <div className="absolute right-6 top-24" style={{ zIndex: 50 }}>
                    <SelectedItemPanel
                        item={selectedItem}
                        onClose={() => setSelectedId(null)}
                        onChange={(updates) => {
                            setLocalItems((prev) =>
                                prev.map((i) => (i.id === selectedItem.id ? { ...i, ...updates } : i))
                            );
                        }}
                    />
                </div>
            )}

            {/* Onboarding - z-100 */}
            {showOnboarding && (
                <div className="absolute inset-0" style={{ zIndex: 100 }}>
                    <OnboardingModal onClose={() => setShowOnboarding(false)} />
                </div>
            )}
        </div>
    );
}
