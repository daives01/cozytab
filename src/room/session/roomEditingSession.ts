import { MAX_ROOM_ITEMS } from "@shared/roomLimits";
import { ConvexError } from "convex/values";
import { createId } from "@/utils/id";
import { clampItemPosition } from "../utils/roomActions";
import type {
    CreateRoomEditingSessionOptions,
    EditingResult,
    PersistedChangeVisibility,
    PlacementEligibility,
    PlacementResult,
    RoomEditingSession,
    RoomEditingSnapshot,
} from "./types";

function saveErrorMessage(error: unknown): string {
    const message = error instanceof ConvexError && typeof error.data === "string"
        ? error.data
        : error instanceof Error ? error.message : typeof error === "string" ? error : "";
    return message.trim() || "Check your connection and try again.";
}

const defaultScheduler = {
    schedule(task: () => void, delayMs: number) {
        const timer = setTimeout(task, delayMs);
        return () => clearTimeout(timer);
    },
};

export function createRoomEditingSession({
    roomId,
    persistence,
    ownedCount = () => Number.MAX_SAFE_INTEGER,
    createItemId = createId,
    scheduler = defaultScheduler,
    debounceMs = 400,
}: CreateRoomEditingSessionOptions): RoomEditingSession {
    let ownedCountSource = ownedCount;
    const recoveredItems = persistence.draft?.load();
    let snapshot: RoomEditingSnapshot = {
        roomId,
        items: (recoveredItems ?? persistence.load()).map(clampItemPosition),
        mode: "view",
        selectedItemId: null,
        draggedItemId: null,
        placingCatalogItemId: null,
        saveStatus: recoveredItems ? "unsaved" : "clean",
        saveError: null,
        canSwitchRooms: !recoveredItems,
    };
    let revision = recoveredItems ? 1 : 0;
    let savedRevision = 0;
    let disposed = false;
    let cancelScheduledSave: (() => void) | null = null;
    let inFlight: Promise<void> | null = null;
    let saveRequestedWhileInFlight = false;
    const listeners = new Set<() => void>();

    const publish = (changes: Partial<RoomEditingSnapshot>) => {
        if (disposed) return;
        const next = { ...snapshot, ...changes };
        next.canSwitchRooms = next.mode === "view" && next.saveStatus === "clean";
        snapshot = next;
        listeners.forEach((listener) => listener());
    };

    const scheduleSave = () => {
        cancelScheduledSave?.();
        cancelScheduledSave = scheduler.schedule(() => {
            cancelScheduledSave = null;
            void saveCurrentRevision();
        }, debounceMs);
    };

    const recordItems = (items: RoomEditingSnapshot["items"], visibility: PersistedChangeVisibility) => {
        if (disposed) return;
        let checkpointError: unknown;
        try {
            persistence.draft?.write(items);
        } catch (error) {
            checkpointError = error;
        }
        revision += 1;
        publish({ items, saveStatus: snapshot.saveStatus === "error" ? "error" : "unsaved" });
        if (checkpointError) publish({ saveStatus: "error", saveError: saveErrorMessage(checkpointError) });
        if (visibility === "visitor-observable") {
            cancelScheduledSave?.();
            cancelScheduledSave = null;
            void saveCurrentRevision();
        } else {
            scheduleSave();
        }
    };

    const saveCurrentRevision = (): Promise<void> => {
        if (revision === savedRevision) return Promise.resolve();
        if (disposed && persistence.draft?.isCurrent?.(snapshot.items) === false) return Promise.resolve();
        if (inFlight) {
            saveRequestedWhileInFlight = true;
            return inFlight;
        }

        const savingRevision = revision;
        const savingItems = snapshot.items;
        publish({ saveStatus: "saving" });
        let saving: Promise<RoomEditingSnapshot["items"]>;
        try {
            saving = persistence.save(savingItems);
        } catch (error) {
            saving = Promise.reject(error);
        }
        inFlight = saving
            .then((canonicalItems) => {
                savedRevision = Math.max(savedRevision, savingRevision);
                persistence.draft?.acknowledge(savingItems);
                if (!disposed && revision === savingRevision) {
                    publish({ items: canonicalItems.map(clampItemPosition), saveStatus: "clean", saveError: null });
                } else if (!disposed) {
                    publish({ saveStatus: "unsaved" });
                }
            })
            .catch((error: unknown) => {
                if (!disposed) publish({
                    saveStatus: "error",
                    saveError: saveErrorMessage(error),
                });
            })
            .finally(() => {
                inFlight = null;
                const shouldSaveAgain = saveRequestedWhileInFlight;
                saveRequestedWhileInFlight = false;
                if (shouldSaveAgain && revision !== savedRevision) {
                    void saveCurrentRevision();
                }
            });
        return inFlight;
    };

    const editingItem = (itemId: string): EditingResult | null => {
        if (snapshot.mode !== "edit") return { accepted: false, reason: "not-editing" };
        if (!snapshot.items.some((item) => item.id === itemId)) return { accepted: false, reason: "item-not-found" };
        return null;
    };

    const placementEligibility = (catalogItemId: Parameters<RoomEditingSession["placementEligibility"]>[0]): PlacementEligibility => {
        const owned = Math.max(0, ownedCountSource(catalogItemId));
        const placed = snapshot.items.filter((item) => item.catalogItemId === catalogItemId).length;
        const remaining = Math.max(0, owned - placed);
        const roomAtCapacity = snapshot.items.length >= MAX_ROOM_ITEMS;
        return { allowed: remaining > 0 && !roomAtCapacity, roomAtCapacity, ownedCount: owned, placedCount: placed, remaining };
    };

    const flush = async () => {
        cancelScheduledSave?.();
        cancelScheduledSave = null;
        if (inFlight) await inFlight;
        if (revision !== savedRevision) await saveCurrentRevision();
    };

    return {
        getSnapshot: () => snapshot,
        subscribe: (listener) => {
            listeners.add(listener);
            return () => listeners.delete(listener);
        },
        updateOwnedCount: (nextOwnedCount) => {
            ownedCountSource = nextOwnedCount;
        },
        enterEditMode: () => publish({ mode: "edit" }),
        exitEditMode: () => {
            publish({ mode: "view", selectedItemId: null, draggedItemId: null, placingCatalogItemId: null });
            cancelScheduledSave?.();
            cancelScheduledSave = null;
            void saveCurrentRevision();
        },
        select: (selectedItemId) => publish({ selectedItemId }),
        beginDrag: (itemId) => {
            const rejected = editingItem(itemId);
            if (rejected) return rejected;
            publish({ draggedItemId: itemId });
            return { accepted: true };
        },
        endDrag: () => publish({ draggedItemId: null }),
        beginPlacement: (catalogItemId) => {
            if (snapshot.mode !== "edit") return { accepted: false, reason: "not-editing" };
            if (snapshot.items.length >= MAX_ROOM_ITEMS) return { accepted: false, reason: "room-full" };
            if (!placementEligibility(catalogItemId).allowed) {
                return { accepted: false, reason: "insufficient-ownership" };
            }
            publish({ placingCatalogItemId: catalogItemId });
            return { accepted: true };
        },
        cancelPlacement: () => publish({ placingCatalogItemId: null }),
        placementEligibility,
        place: ({ catalogItemId, x, y }): PlacementResult => {
            if (snapshot.mode !== "edit") return { accepted: false, reason: "not-editing" };
            if (snapshot.items.length >= MAX_ROOM_ITEMS) return { accepted: false, reason: "room-full" };
            if (!placementEligibility(catalogItemId).allowed) return { accepted: false, reason: "insufficient-ownership" };
            const itemId = createItemId();
            recordItems([...snapshot.items, clampItemPosition({ id: itemId, catalogItemId, x, y, flipped: false })], "structural");
            publish({ placingCatalogItemId: null });
            return { accepted: true, itemId };
        },
        move: (itemId, position) => {
            const rejected = editingItem(itemId);
            if (rejected) return rejected;
            recordItems(snapshot.items.map((item) => item.id === itemId ? clampItemPosition({ ...item, ...position }) : item), "structural");
            return { accepted: true };
        },
        flip: (itemId) => {
            const rejected = editingItem(itemId);
            if (rejected) return rejected;
            recordItems(snapshot.items.map((item) => item.id === itemId ? { ...item, flipped: !item.flipped } : item), "structural");
            return { accepted: true };
        },
        remove: (itemId) => {
            const rejected = editingItem(itemId);
            if (rejected) return rejected;
            recordItems(snapshot.items.filter((item) => item.id !== itemId), "structural");
            publish({ selectedItemId: snapshot.selectedItemId === itemId ? null : snapshot.selectedItemId });
            return { accepted: true };
        },
        bringToFront: (itemId) => {
            const rejected = editingItem(itemId);
            if (rejected) return rejected;
            const item = snapshot.items.find((candidate) => candidate.id === itemId)!;
            recordItems([...snapshot.items.filter((candidate) => candidate.id !== itemId), item], "structural");
            return { accepted: true };
        },
        sendToBack: (itemId) => {
            const rejected = editingItem(itemId);
            if (rejected) return rejected;
            const item = snapshot.items.find((candidate) => candidate.id === itemId)!;
            recordItems([item, ...snapshot.items.filter((candidate) => candidate.id !== itemId)], "structural");
            return { accepted: true };
        },
        changePersistedItem: (itemId, changes, visibility = "structural") => {
            if (visibility === "structural" && snapshot.mode !== "edit") {
                return { accepted: false, reason: "not-editing" };
            }
            const item = snapshot.items.find((candidate) => candidate.id === itemId);
            if (!item) return { accepted: false, reason: "item-not-found" };
            recordItems(snapshot.items.map((candidate) => candidate.id === itemId ? clampItemPosition({ ...candidate, ...changes }) : candidate), visibility);
            return { accepted: true };
        },
        flush,
        retrySave: flush,
        dispose: () => {
            if (disposed) return;
            cancelScheduledSave?.();
            cancelScheduledSave = null;
            disposed = true;
            // Detach immediately, but drain a pending revision after any older
            // request. Failed requests leave the synchronous draft for recovery.
            void (async () => {
                if (inFlight) await inFlight;
                if (revision !== savedRevision) await saveCurrentRevision();
            })();
            listeners.clear();
        },
    };
}
