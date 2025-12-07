import type React from "react";
import type { Id } from "../../../convex/_generated/dataModel";

export type GuestDrawerItem = {
    inventoryId: Id<"inventory"> | string;
    catalogItemId: string;
    name: string;
    assetUrl: string;
    category: string;
    hidden?: boolean;
};

export interface AssetDrawerProps {
    isOpen: boolean;
    onDragStart: (e: React.DragEvent, id: string) => void;
    highlightComputer?: boolean;
    isGuest?: boolean;
    guestItems?: GuestDrawerItem[] | undefined;
    orientation?: "left" | "bottom";
}

export interface FilterPillsProps {
    categories: string[];
    selectedFilter: string;
    onChange: (next: string) => void;
}

export interface ItemCardProps {
    item: GuestDrawerItem;
    highlightComputer?: boolean;
    isGuest?: boolean;
    isPending?: boolean;
    showHideControls?: boolean;
    onDragStart: (e: React.DragEvent, id: string) => void;
    onToggleHidden: (inventoryId: Id<"inventory"> | string, nextHidden: boolean) => void;
    compact?: boolean;
}

export interface HiddenItemsSectionProps {
    items: GuestDrawerItem[];
    collapsed: boolean;
    isBulkUnhiding: boolean;
    onToggleSection: () => void;
    onUnhideAll: () => void;
    onDragStart: (e: React.DragEvent, id: string) => void;
    onToggleHidden: (inventoryId: Id<"inventory"> | string, nextHidden: boolean) => void;
    pendingHides: Record<string, boolean>;
    isGuest: boolean;
    showHideControls: boolean;
    highlightComputer?: boolean;
}
