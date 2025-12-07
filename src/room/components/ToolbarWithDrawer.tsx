import type React from "react";
import { RoomToolbar } from "../RoomToolbar";
import { EditDrawer } from "../EditDrawer";

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
    guestItems?: React.ComponentProps<typeof EditDrawer>["guestItems"];
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
                orientation={drawerOrientation}
            />
        </>
    );
}
