import { ChevronLeft, ChevronRight, ChevronUp, ChevronDown } from "lucide-react";
import type React from "react";
import type { Id } from "@convex/_generated/dataModel";
import { AssetDrawer } from "./AssetDrawer";
import { ASSET_DRAWER_WIDTH, ASSET_DRAWER_BOTTOM_HEIGHT } from "./AssetDrawer/constants";
import type { GuestDrawerItem } from "./AssetDrawer/types";
import { TrashCan } from "./TrashCan";

type Mode = "view" | "edit";

interface EditDrawerProps {
    mode: Mode;
    isDrawerOpen: boolean;
    onDrawerToggle: () => void;
    draggedItemId: string | null;
    onDeleteItem: (itemId: string) => void;
    onTouchPlaceItem?: (catalogItemId: Id<"catalogItems">, event: React.PointerEvent) => void;
    onTouchPlacementCancel?: () => void;
    highlightComputer: boolean;
    touchPlacementItemId?: Id<"catalogItems"> | null;
    isGuest: boolean;
    guestItems?: GuestDrawerItem[];
    placedCatalogItemIds?: Id<"catalogItems">[];
    orientation?: "left" | "bottom";
}

export function EditDrawer({
    mode,
    isDrawerOpen,
    onDrawerToggle,
    draggedItemId,
    onDeleteItem,
    onTouchPlaceItem,
    onTouchPlacementCancel,
    highlightComputer,
    touchPlacementItemId,
    isGuest,
    guestItems,
    placedCatalogItemIds,
    orientation = "left",
}: EditDrawerProps) {
    const isLeft = orientation === "left";
    const drawerOffset = isLeft && isDrawerOpen ? ASSET_DRAWER_WIDTH + 12 : 0;
    const drawerBottomOffset = !isLeft && isDrawerOpen ? ASSET_DRAWER_BOTTOM_HEIGHT + 12 : 0;
    const togglePositionStyle = isLeft
        ? { left: isDrawerOpen ? `${ASSET_DRAWER_WIDTH}px` : "0px", top: "50%", transform: "translateY(-50%)" }
        : {
              bottom: isDrawerOpen ? `${ASSET_DRAWER_BOTTOM_HEIGHT}px` : "0px",
              left: "50%",
              transform: "translate(-50%)",
          };
    const isInteractive = mode === "edit";
    const isVisible = isInteractive || isDrawerOpen;

    return (
        <div
            className={`${!isVisible ? "pointer-events-none" : "pointer-events-auto"} transition-opacity duration-200`}
            aria-hidden={!isInteractive}
        >
            <div
                className={`absolute z-50 transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${isInteractive ? "opacity-100" : "opacity-0 pointer-events-none"}`}
                style={togglePositionStyle}
            >
                <button
                    data-onboarding="drawer-toggle"
                    onClick={isInteractive ? onDrawerToggle : undefined}
                    disabled={!isInteractive}
                    className={`flex items-center justify-center border-2 border-[var(--color-foreground)] bg-[var(--color-secondary)] text-[var(--color-foreground)] shadow-none transition-all outline-none ${
                        isLeft
                            ? "h-16 w-8 rounded-r-xl border-l-0 hover:translate-x-[1px] hover:shadow-none active:translate-x-[1px] active:translate-y-[1px]"
                            : "h-10 w-16 rounded-t-xl border-b-0 hover:-translate-y-[1px] hover:shadow-none active:translate-y-[1px]"
                    }`}
                >
                    {isLeft
                        ? isDrawerOpen
                            ? <ChevronLeft className="h-6 w-6" />
                            : <ChevronRight className="h-6 w-6" />
                        : isDrawerOpen
                            ? <ChevronDown className="h-5 w-5" />
                            : <ChevronUp className="h-5 w-5" />}
                </button>
            </div>

            <AssetDrawer
                isOpen={isDrawerOpen}
                onDragStart={(e: React.DragEvent, id: Id<"catalogItems">) => {
                    e.dataTransfer.setData("catalogItemId", String(id));
                }}
                onTouchPlace={onTouchPlaceItem}
                onTouchPlacementCancel={onTouchPlacementCancel}
                highlightComputer={highlightComputer}
                touchPlacementItemId={touchPlacementItemId}
                isGuest={isGuest}
                guestItems={guestItems}
                placedCatalogItemIds={placedCatalogItemIds}
                orientation={orientation}
            />

            {isInteractive && draggedItemId && (
                <TrashCan
                    draggedItemId={draggedItemId}
                    onDelete={(itemId) => {
                        onDeleteItem(itemId);
                    }}
                    offsetLeft={drawerOffset}
                    offsetBottom={drawerBottomOffset}
                />
            )}
        </div>
    );
}
