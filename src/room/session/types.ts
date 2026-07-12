import type { Id } from "@convex/_generated/dataModel";
import type { RoomItem } from "@shared/guestTypes";

export type RoomEditingMode = "view" | "edit";
export type RoomSaveStatus = "clean" | "saving" | "unsaved";
export type PersistedChangeVisibility = "structural" | "visitor-observable";

export interface RoomEditingSnapshot {
    readonly roomId: string;
    readonly items: RoomItem[];
    readonly mode: RoomEditingMode;
    readonly selectedItemId: string | null;
    readonly draggedItemId: string | null;
    readonly placingCatalogItemId: Id<"catalogItems"> | null;
    readonly saveStatus: RoomSaveStatus;
    readonly canSwitchRooms: boolean;
}

export interface PlacementEligibility {
    allowed: boolean;
    ownedCount: number;
    placedCount: number;
    remaining: number;
}

export type EditingRejection = "not-editing" | "item-not-found" | "insufficient-ownership";
export type EditingResult = { accepted: true } | { accepted: false; reason: EditingRejection };
export type PlacementResult = { accepted: true; itemId: string } | { accepted: false; reason: EditingRejection };

export interface RoomPersistence {
    load(): RoomItem[];
    save(items: RoomItem[]): Promise<RoomItem[]>;
}

export interface RoomSessionScheduler {
    schedule(task: () => void, delayMs: number): () => void;
}

export interface RoomEditingSession {
    getSnapshot(): RoomEditingSnapshot;
    subscribe(listener: () => void): () => void;
    updateOwnedCount(ownedCount: (catalogItemId: Id<"catalogItems">) => number): void;
    enterEditMode(): void;
    exitEditMode(): void;
    select(itemId: string | null): void;
    beginDrag(itemId: string): EditingResult;
    endDrag(): void;
    beginPlacement(catalogItemId: Id<"catalogItems">): EditingResult;
    cancelPlacement(): void;
    placementEligibility(catalogItemId: Id<"catalogItems">): PlacementEligibility;
    place(input: { catalogItemId: Id<"catalogItems">; x: number; y: number }): PlacementResult;
    move(itemId: string, position: { x: number; y: number }): EditingResult;
    flip(itemId: string): EditingResult;
    remove(itemId: string): EditingResult;
    bringToFront(itemId: string): EditingResult;
    sendToBack(itemId: string): EditingResult;
    changePersistedItem(
        itemId: string,
        changes: Partial<Omit<RoomItem, "id" | "catalogItemId">>,
        visibility?: PersistedChangeVisibility
    ): EditingResult;
    flush(): Promise<void>;
    dispose(): void;
}

export interface CreateRoomEditingSessionOptions {
    roomId: string;
    persistence: RoomPersistence;
    ownedCount?: (catalogItemId: Id<"catalogItems">) => number;
    createItemId?: () => string;
    scheduler?: RoomSessionScheduler;
    debounceMs?: number;
}
