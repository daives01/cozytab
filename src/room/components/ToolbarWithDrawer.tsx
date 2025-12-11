import type { Id } from "@convex/_generated/dataModel";
import { RoomToolbar } from "../RoomToolbar";
import { EditDrawer } from "../EditDrawer";
import type { GuestDrawerItem } from "../AssetDrawer/types";

type Mode = "view" | "edit";

interface ToolbarWithDrawerProps {
    isGuest: boolean;
    mode: Mode;
    shareAllowed: boolean;
    visitorCount: number;
    drawerOffset: number;
    drawerOrientation: "left" | "bottom";
    isDrawerOpen: boolean;
    draggedItemId: string | null;
    highlightComputer: boolean;
    guestItems?: GuestDrawerItem[];
    placedCatalogItemIds?: Id<"catalogItems">[];
    onToggleMode: () => void;
    onShareClick: () => void;
    onDrawerToggle: () => void;
    onDeleteItem: (itemId: string) => void;
}

export function ToolbarWithDrawer({
    isGuest,
    mode,
    shareAllowed,
    visitorCount,
    drawerOffset,
    drawerOrientation,
    isDrawerOpen,
    draggedItemId,
    highlightComputer,
    guestItems,
    placedCatalogItemIds,
    onToggleMode,
    onShareClick,
    onDrawerToggle,
    onDeleteItem,
}: ToolbarWithDrawerProps) {
    return (
        <>
            <RoomToolbar
                isGuest={isGuest}
                mode={mode}
                onToggleMode={onToggleMode}
                shareAllowed={shareAllowed}
                visitorCount={visitorCount}
                onShareClick={onShareClick}
                drawerOffset={drawerOffset}
                drawerOrientation={drawerOrientation}
            />

            <EditDrawer
                mode={mode}
                isDrawerOpen={isDrawerOpen}
                onDrawerToggle={onDrawerToggle}
                draggedItemId={draggedItemId}
                onDeleteItem={onDeleteItem}
                highlightComputer={highlightComputer}
                isGuest={isGuest}
                guestItems={guestItems}
                placedCatalogItemIds={placedCatalogItemIds}
                orientation={drawerOrientation}
            />
        </>
    );
}
