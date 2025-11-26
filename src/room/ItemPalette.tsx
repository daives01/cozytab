import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { RoomItem } from "../types";

interface ItemPaletteProps {
    onAddItem: (item: Partial<RoomItem>) => void;
}

export function ItemPalette({ onAddItem }: ItemPaletteProps) {
    const catalogItems = useQuery(api.catalog.list);
    const seedCatalog = useMutation(api.catalog.seed);

    if (!catalogItems) return <div className="p-4 text-sm text-gray-500 font-['Patrick_Hand']">Loading catalog...</div>;

    return (
        <div className="bg-white rounded-2xl shadow-[4px_4px_0px_0px_rgba(31,41,55,1)] border-2 border-gray-800 p-3 flex gap-3 overflow-x-auto max-w-full">
            {catalogItems.map((item: any) => (
                <button
                    key={item._id}
                    className="flex flex-col items-center gap-2 p-2 hover:bg-blue-50 rounded-xl transition-all active:scale-95 min-w-[90px] group"
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
                    <div className="w-16 h-16 bg-gray-100 rounded-lg border-2 border-gray-800 flex items-center justify-center overflow-hidden group-hover:border-blue-500 transition-colors bg-cover bg-center"
                        style={{ backgroundImage: `url(${item.assetUrl})` }}
                    >
                        {!item.assetUrl && <span className="text-xs text-gray-400">No Img</span>}
                    </div>
                    <span className="text-sm font-bold text-gray-700 group-hover:text-blue-600 font-['Patrick_Hand']">{item.name}</span>
                </button>
            ))}

            {catalogItems.length === 0 && (
                <div className="p-2 flex items-center">
                    <button
                        onClick={() => seedCatalog()}
                        className="px-4 py-2 bg-blue-100 text-blue-700 rounded-xl border-2 border-blue-300 hover:bg-blue-200 font-bold font-['Patrick_Hand']"
                    >
                        Seed Catalog
                    </button>
                </div>
            )}
        </div>
    );
}
