import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useEffect, useState } from "react";
import { RoomCanvas } from "./RoomCanvas";
import type { RoomItem } from "../types";
import { SelectedItemPanel } from "./SelectedItemPanel";
import { ItemPalette } from "./ItemPalette";
import { OnboardingModal } from "./OnboardingModal";

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

    if (!room) return <div className="h-screen w-screen flex items-center justify-center">Loading room...</div>;

    return (
        <div className="h-screen w-screen flex flex-col overflow-hidden">
            <header className="flex items-center justify-between p-4 bg-white/80 backdrop-blur-sm fixed top-0 left-0 right-0 z-50 shadow-sm">
                <h1 className="text-xl font-bold text-gray-800">Nook</h1>
                <div className="flex gap-2">
                    <button
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${mode === "view"
                                ? "bg-blue-600 text-white hover:bg-blue-700"
                                : "bg-gray-200 text-gray-800 hover:bg-gray-300"
                            }`}
                        onClick={() => setMode((m) => (m === "view" ? "edit" : "view"))}
                    >
                        {mode === "view" ? "Enter Edit Mode" : "Exit Edit Mode"}
                    </button>
                    {mode === "edit" && (
                        <button
                            className="px-4 py-2 rounded-lg font-medium bg-green-600 text-white hover:bg-green-700 transition-colors"
                            onClick={async () => {
                                await saveRoom({
                                    roomId: room._id,
                                    items: localItems,
                                });
                                setMode("view");
                            }}
                        >
                            Save Changes
                        </button>
                    )}
                </div>
            </header>

            <div className="flex-1 relative">
                <RoomCanvas
                    backgroundTheme={room.backgroundTheme}
                    items={localItems}
                    mode={mode}
                    selectedId={selectedId}
                    onItemsChange={setLocalItems}
                    onSelectItem={setSelectedId}
                />

                {mode === "edit" && selectedItem && (
                    <SelectedItemPanel
                        item={selectedItem}
                        onClose={() => setSelectedId(null)}
                        onChange={(updates) => {
                            setLocalItems((prev) =>
                                prev.map((i) => (i.id === selectedItem.id ? { ...i, ...updates } : i))
                            );
                        }}
                    />
                )}

                {mode === "edit" && (
                    <ItemPalette
                        onAddItem={(newItem) => {
                            const item: RoomItem = {
                                id: crypto.randomUUID(),
                                catalogItemId: newItem.catalogItemId!,
                                x: newItem.x!,
                                y: newItem.y!,
                                scaleX: newItem.scaleX!,
                                scaleY: newItem.scaleY!,
                                rotation: newItem.rotation!,
                                zIndex: newItem.zIndex!,
                                url: "",
                            };
                            setLocalItems((prev) => [...prev, item]);
                        }}
                    />
                )}

                {showOnboarding && (
                    <OnboardingModal onClose={() => setShowOnboarding(false)} />
                )}
            </div>
        </div>
    );
}
