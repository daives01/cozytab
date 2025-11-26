import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

interface AssetDrawerProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    onDragStart: (e: React.DragEvent, catalogItemId: string) => void;
}

export function AssetDrawer({ isOpen, onOpenChange, onDragStart }: AssetDrawerProps) {
    const catalogItems = useQuery(api.catalog.list);

    return (
        <Sheet open={isOpen} onOpenChange={onOpenChange} modal={false}>
            <SheetContent side="left" className="w-[300px] sm:w-[400px] p-0 bg-background/95 backdrop-blur-sm border-r border-border">
                <SheetHeader className="p-6 border-b border-border">
                    <SheetTitle className="font-['Patrick_Hand'] text-2xl">Assets</SheetTitle>
                </SheetHeader>
                <ScrollArea className="h-[calc(100vh-80px)]">
                    <div className="p-6 grid grid-cols-2 gap-4">
                        {catalogItems?.map((item: any) => (
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
                                        className="object-contain w-full h-full p-2"
                                        draggable={false}
                                    />
                                </div>
                                <div className="mt-2 text-center">
                                    <span className="font-['Patrick_Hand'] text-sm">{item.name}</span>
                                </div>
                            </Card>
                        ))}
                    </div>
                </ScrollArea>
            </SheetContent>
        </Sheet>
    );
}
