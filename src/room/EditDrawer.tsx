import { ChevronLeft, ChevronRight } from "lucide-react";
import type React from "react";
import { AssetDrawer, ASSET_DRAWER_WIDTH } from "./AssetDrawer";
import { TrashCan } from "./TrashCan";

type Mode = "view" | "edit";

interface EditDrawerProps {
    mode: Mode;
    isDrawerOpen: boolean;
    onDrawerToggle: () => void;
    draggedItemId: string | null;
    onDeleteItem: (itemId: string) => void;
    highlightComputer: boolean;
    isGuest: boolean;
    guestItems?: React.ComponentProps<typeof AssetDrawer>["guestItems"];
}

export function EditDrawer({
    mode,
    isDrawerOpen,
    onDrawerToggle,
    draggedItemId,
    onDeleteItem,
    highlightComputer,
    isGuest,
    guestItems,
}: EditDrawerProps) {
    if (mode !== "edit") return null;

    return (
        <>
            <div
                className="absolute top-1/2 transform -translate-y-1/2 z-50 transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]"
                style={{ right: isDrawerOpen ? `${ASSET_DRAWER_WIDTH}px` : "0px" }}
            >
                <button
                    data-onboarding="drawer-toggle"
                    onClick={onDrawerToggle}
                    className="bg-[var(--paper-header)] hover:bg-[var(--secondary)] text-[var(--ink)] h-16 w-8 rounded-l-lg border-y-2 border-l-2 border-[var(--ink)] shadow-md flex items-center justify-center transition-colors outline-none active:scale-95 active:shadow-sm active:translate-x-[1px] active:translate-y-[1px]"
                >
                    {isDrawerOpen ? <ChevronRight className="h-6 w-6" /> : <ChevronLeft className="h-6 w-6" />}
                </button>
            </div>

            <AssetDrawer
                isOpen={isDrawerOpen}
                onDragStart={(e: React.DragEvent, id: string) => {
                    e.dataTransfer.setData("catalogItemId", id);
                }}
                highlightComputer={highlightComputer}
                isGuest={isGuest}
                guestItems={guestItems}
            />

            <TrashCan
                draggedItemId={draggedItemId}
                onDelete={(itemId) => {
                    onDeleteItem(itemId);
                }}
            />
        </>
    );
}
