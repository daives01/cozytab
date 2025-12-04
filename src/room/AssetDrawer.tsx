import { Card } from "@/components/ui/card";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Doc } from "../../convex/_generated/dataModel";
import type React from "react";
import { Package } from "lucide-react";
import { AssetImage } from "../components/AssetImage";

interface AssetDrawerProps {
    isOpen: boolean;
    onDragStart: (e: React.DragEvent, id: string) => void;
    highlightComputer?: boolean;
}

export function AssetDrawer({ isOpen, onDragStart, highlightComputer }: AssetDrawerProps) {
    const inventoryItems = useQuery(api.inventory.getMyInventory);

    return (
        <div 
            className={`absolute top-4 right-0 bottom-4 w-[160px] bg-[var(--paper-header)] border-2 border-[var(--ink)] rounded-lg z-40 shadow-lg transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] flex flex-col ${
                isOpen ? "translate-x-0" : "translate-x-full"
            }`}
        >
            {/* Box Flap visual */}
            <div className={`absolute top-1/2 -translate-y-1/2 w-3 h-16 bg-[var(--ink)] rounded-l-md transition-all duration-300 ${
                isOpen ? "-left-3" : "left-0"
            }`} />

            <div className="p-4 border-b-2 border-[var(--ink)] border-dashed">
                <h2 className="font-['Patrick_Hand'] text-2xl font-bold text-[var(--ink)] text-center uppercase tracking-widest opacity-80">
                    Storage
                </h2>
            </div>
            
            <ScrollArea className="flex-1 min-h-0 bg-[var(--paper)]/50">
                <div className="p-3 grid grid-cols-1 gap-4">
                    {inventoryItems && inventoryItems.length > 0 ? (
                        inventoryItems.map((item: Doc<"catalogItems">) => {
                            const isComputer = item.name.toLowerCase().includes("computer");
                            return (
                                <Card
                                    key={item._id}
                                    data-onboarding={isComputer ? "storage-item-computer" : undefined}
                                    className={`p-1 cursor-grab active:cursor-grabbing hover:scale-105 transition-transform border-2 shadow-sm bg-white rotate-1 hover:rotate-0 select-none ${
                                        highlightComputer && isComputer
                                            ? "border-[var(--warning)] ring-2 ring-[var(--warning-light)]"
                                            : "border-[var(--ink)]"
                                    }`}
                                    draggable
                                    onDragStart={(e) => {
                                        e.dataTransfer.effectAllowed = "move";
                                        onDragStart(e, item._id);
                                    }}
                                >
                                    <div className="aspect-square relative flex items-center justify-center bg-[var(--muted)] overflow-hidden rounded-sm">
                                        <AssetImage
                                            assetUrl={item.assetUrl}
                                            alt={item.name}
                                            className="object-contain w-full h-full"
                                            draggable={false}
                                        />
                                    </div>
                                    <div className="mt-1 text-center border-t border-dashed border-[var(--ink)]/20 pt-1">
                                        <span className="font-['Patrick_Hand'] text-sm font-bold text-[var(--ink-muted)] truncate block">
                                            {item.name}
                                        </span>
                                    </div>
                                </Card>
                            );
                        })
                    ) : (
                        <div className="p-4 flex flex-col items-center gap-3 text-center">
                            <Package className="h-10 w-10 text-[var(--ink-subtle)] opacity-60" />
                            <p className="font-['Patrick_Hand'] text-sm text-[var(--ink-muted)]">
                                Your storage is empty!
                            </p>
                            <p className="font-['Patrick_Hand'] text-xs text-[var(--ink-subtle)]">
                                Visit the shop on your computer to buy items.
                            </p>
                        </div>
                    )}
                </div>
            </ScrollArea>
        </div>
    );
}
