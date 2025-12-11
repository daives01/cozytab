import { useCallback, useMemo } from "react";
import type { Id } from "@convex/_generated/dataModel";
import { addInventoryCounts, countIds, remainingForId } from "../utils/itemCounts";

type InventoryWithCounts = { catalogItemId: Id<"catalogItems">; count?: number };

type PlacementAllowanceArgs = {
    isGuest: boolean;
    placedCatalogItemIds: Id<"catalogItems">[];
    guestInventoryIds: Id<"catalogItems">[];
    inventoryItems?: InventoryWithCounts[] | undefined;
    inventoryLoading?: boolean;
};

export function usePlacementAllowance({
    isGuest,
    placedCatalogItemIds,
    guestInventoryIds,
    inventoryItems,
    inventoryLoading = false,
}: PlacementAllowanceArgs) {
    const placedCounts = useMemo(() => countIds(placedCatalogItemIds), [placedCatalogItemIds]);

    const ownedCounts = useMemo(() => {
        const guestCounts = countIds(guestInventoryIds);
        return addInventoryCounts(inventoryItems, guestCounts);
    }, [guestInventoryIds, inventoryItems]);

    const getCounts = useCallback(
        (catalogItemId: Id<"catalogItems">) => {
            // When loading inventory for authed users, allow optimistic placement to avoid UI jitter.
            if (!isGuest && inventoryLoading) {
                return { ownedCount: Number.MAX_SAFE_INTEGER, placedCount: placedCounts.get(String(catalogItemId)) ?? 0, remaining: Number.MAX_SAFE_INTEGER };
            }
            return remainingForId(catalogItemId, ownedCounts, placedCounts);
        },
        [isGuest, inventoryLoading, ownedCounts, placedCounts]
    );

    const canPlace = useCallback(
        (catalogItemId: Id<"catalogItems">) => {
            const { remaining } = getCounts(catalogItemId);
            return remaining > 0;
        },
        [getCounts]
    );

    return { canPlace, getCounts, ownedCounts, placedCounts };
}

