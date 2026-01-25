import type { Id } from "@convex/_generated/dataModel";
import type { RoomItem } from "@shared/guestTypes";

type CatalogId = Id<"catalogItems"> | string;

function toKey(id: CatalogId) {
    return String(id);
}

export function countIds(ids: CatalogId[] = []): Map<string, number> {
    const counts = new Map<string, number>();
    ids.forEach((id) => {
        const key = toKey(id);
        counts.set(key, (counts.get(key) ?? 0) + 1);
    });
    return counts;
}

export function countRoomItems(items: Pick<RoomItem, "catalogItemId">[] = []): Map<string, number> {
    return countIds(items.map((item) => item.catalogItemId));
}

export function addInventoryCounts(
    inventory: Array<{ catalogItemId: Id<"catalogItems">; count?: number }> | undefined,
    baseCounts: Map<string, number> = new Map()
): Map<string, number> {
    const counts = new Map(baseCounts);
    inventory?.forEach((item) => {
        const key = toKey(item.catalogItemId);
        counts.set(key, (counts.get(key) ?? 0) + (item.count ?? 1));
    });
    return counts;
}

export function remainingForId(
    catalogItemId: CatalogId,
    ownedCounts: Map<string, number>,
    placedCounts: Map<string, number>
) {
    const key = toKey(catalogItemId);
    const owned = ownedCounts.get(key) ?? 0;
    const placed = placedCounts.get(key) ?? 0;
    return {
        ownedCount: owned,
        placedCount: placed,
        remaining: Math.max(0, owned - placed),
    };
}

