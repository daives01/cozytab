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

    if (!isOpen) return null;

    return (
        <div className="absolute top-0 right-0 h-full w-[140px] bg-background/90 backdrop-blur-sm border-l border-border z-40 shadow-xl transition-transform duration-300 ease-in-out">
            <div className="p-4 border-b border-border">
                <h2 className="font-['Patrick_Hand'] text-xl text-center">Assets</h2>
            </div>
            <ScrollArea className="h-[calc(100vh-60px)]">
                <div className="p-3 grid grid-cols-1 gap-4">
                    {catalogItems && catalogItems.length > 0 ? (
                        catalogItems.map((item: Doc<"catalogItems">) => (
                            <Card
                                key={item._id}
                                className="p-2 cursor-grab active:cursor-grabbing hover:bg-accent transition-colors border-2 border-transparent hover:border-primary/20"
                                draggable
                                onDragStart={(e) => onDragStart(e, item._id)}
                            >
                                <div className="aspect-square relative flex items-center justify-center bg-muted/30 rounded-md overflow-hidden">
                                    <img
                                        src={item.assetUrl}
                                        alt={item.name}
                                        className="object-contain w-full h-full p-1"
                                        draggable={false}
                                    />
                                </div>
                                <div className="mt-1 text-center">
                                    <span className="font-['Patrick_Hand'] text-xs truncate block">{item.name}</span>
                                </div>
                            </Card>
                        ))
                    ) : (
                        <div className="p-4 flex flex-col items-center gap-3">
                            <p className="font-['Patrick_Hand'] text-sm text-center text-muted-foreground">
                                No items yet
                            </p>
                            <Button
                                onClick={() => seedCatalog()}
                                className="font-['Patrick_Hand'] text-sm"
                                size="sm"
                            >
                                Seed Catalog
                            </Button>
                        </div>
                    )}
                </div>
            </ScrollArea>
        </div>
    );
}
