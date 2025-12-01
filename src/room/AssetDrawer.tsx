import { Card } from "@/components/ui/card";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import type { Doc } from "../../convex/_generated/dataModel";

interface AssetDrawerProps {
    isOpen: boolean;
    onDragStart: (e: React.DragEvent, id: string) => void;
}

export function AssetDrawer({ isOpen, onDragStart }: AssetDrawerProps) {
    const catalogItems = useQuery(api.catalog.list);
    const seedCatalog = useMutation(api.catalog.seed);

    return (
        <div 
            className={`absolute top-4 right-4 bottom-4 w-[160px] bg-[#e6d2b5] border-4 border-[#c7b299] rounded-lg z-40 shadow-2xl transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] flex flex-col ${
                isOpen ? "translate-x-0" : "translate-x-[200%]"
            }`}
        >
            {/* Box Flap visual */}
            <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-3 h-16 bg-[#c7b299] rounded-l-md" />

            <div className="p-4 border-b-2 border-[#d4c3aa] border-dashed">
                <h2 className="font-['Patrick_Hand'] text-2xl font-bold text-[#5c4d3c] text-center uppercase tracking-widest opacity-80">
                    Storage
                </h2>
            </div>
            
            <ScrollArea className="flex-1 min-h-0 bg-[#f0e6d2]/50">
                <div className="p-3 grid grid-cols-1 gap-4">
                    {catalogItems && catalogItems.length > 0 ? (
                        catalogItems.map((item: Doc<"catalogItems">) => (
                            <Card
                                key={item._id}
                                className="p-1 cursor-grab active:cursor-grabbing hover:scale-105 transition-transform border-4 border-white shadow-md bg-white rotate-1 hover:rotate-0 select-none"
                                draggable
                                onDragStart={(e) => {
                                    e.dataTransfer.effectAllowed = "move";
                                    onDragStart(e, item._id);
                                }}
                                onSelectStart={(e) => e.preventDefault()}
                            >
                                <div className="aspect-square relative flex items-center justify-center bg-gray-100 overflow-hidden rounded-sm">
                                    <img
                                        src={item.assetUrl}
                                        alt={item.name}
                                        className="object-contain w-full h-full"
                                        draggable={false}
                                    />
                                </div>
                                <div className="mt-1 text-center border-t border-dashed border-gray-200 pt-1">
                                    <span className="font-['Patrick_Hand'] text-sm font-bold text-gray-600 truncate block">
                                        {item.name}
                                    </span>
                                </div>
                            </Card>
                        ))
                    ) : (
                        <div className="p-4 flex flex-col items-center gap-3">
                            <p className="font-['Patrick_Hand'] text-sm text-center text-[#5c4d3c]">
                                Box is empty...
                            </p>
                            <Button onClick={() => seedCatalog()} size="sm" variant="secondary">
                                Unpack Goods
                            </Button>
                        </div>
                    )}
                </div>
            </ScrollArea>
        </div>
    );
}
