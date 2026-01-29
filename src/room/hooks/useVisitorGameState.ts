import { useCallback, useEffect, useMemo, useState } from "react";
import type { RoomItem } from "@shared/guestTypes";
import type { GameType } from "@convex/lib/categories";
import type { Doc } from "@convex/_generated/dataModel";

type CatalogItem = Doc<"catalogItems">;

export function useVisitorGameState({
    items,
    catalogItems,
    isComputerOpen,
    activeMusicItem,
    setInMenu,
    setInGame,
}: {
    items: RoomItem[] | undefined;
    catalogItems: CatalogItem[] | undefined;
    isComputerOpen: boolean;
    activeMusicItem: RoomItem | null;
    setInMenu: (inMenu: boolean) => void;
    setInGame: (gameItemId: string | null) => void;
}) {
    const [activeGameItemId, setActiveGameItemId] = useState<string | null>(null);

    const activeGameType = useMemo((): GameType | null => {
        if (!activeGameItemId || !items || !catalogItems) return null;
        const roomItem = items.find((i) => i.id === activeGameItemId);
        if (!roomItem) return null;
        const catalogItem = catalogItems.find((c) => c._id === roomItem.catalogItemId);
        return catalogItem?.gameType ?? null;
    }, [activeGameItemId, items, catalogItems]);

    const isInMenu = isComputerOpen || Boolean(activeMusicItem) || Boolean(activeGameItemId);

    useEffect(() => {
        setInMenu(isInMenu);
    }, [isInMenu, setInMenu]);

    const handleGameActiveChange = useCallback((gameItemId: string | null) => {
        setInGame(gameItemId);
    }, [setInGame]);

    return {
        activeGameItemId,
        setActiveGameItemId,
        activeGameType,
        isInMenu,
        handleGameActiveChange,
    };
}
