import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { RoomItem } from "../types";

interface ItemPaletteProps {
    onAddItem: (item: Partial<RoomItem>) => void;
}

export function ItemPalette({ onAddItem }: ItemPaletteProps) {
    const catalogItems = useQuery(api.catalog.list);
    const seedCatalog = useMutation(api.catalog.seed);

    if (!catalogItems) return <div className="p-4 text-sm text-gray-500">Loading catalog...</div>;

    return (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white rounded-xl shadow-xl p-2 border border-gray-200 flex gap-2 overflow-x-auto max-w-[90vw]">
            {catalogItems.map((item: any) => (
                <button
                    key={item._id}
                    className="flex flex-col items-center gap-1 p-2 hover:bg-gray-50 rounded-lg transition-colors min-w-[80px]"
                    onClick={() => {
                        onAddItem({
                            catalogItemId: item.name,
                            // Randomize slightly to avoid stacking perfectly
                            x: window.innerWidth / 2 + (Math.random() - 0.5) * 50,
                            y: window.innerHeight / 2 + (Math.random() - 0.5) * 50,
                            scaleX: 1,
                            scaleY: 1,
                            rotation: 0,
                            zIndex: Date.now(),
                        });
                    }}
                >
                    <div className="w-12 h-12 bg-gray-100 rounded-md flex items-center justify-center overflow-hidden">
                        <img src={item.assetUrl} alt={item.name} className="w-full h-full object-cover" />
                    </div>
                    <span className="text-xs font-medium text-gray-700">{item.name}</span>
                </button>
            ))}

            {catalogItems.length === 0 && (
                <div className="p-2 flex items-center">
                    <button
                        onClick={() => seedCatalog()}
                        className="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-sm font-medium"
                    >
                        Seed Catalog
                    </button>
                </div>
            )}
        </div>
    );
}
