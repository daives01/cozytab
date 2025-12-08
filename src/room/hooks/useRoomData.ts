import { useMemo } from "react";
import { useQuery } from "convex/react";
import type { Id } from "../../../convex/_generated/dataModel";
import { api } from "../../../convex/_generated/api";
import { STARTER_COMPUTER_NAME } from "../../../shared/guestTypes";
import { useResolvedBackgroundUrl } from "./useResolvedBackgroundUrl";
import type { TimeOfDay } from "../roomConstants";

interface RoomDataArgs {
    isGuest: boolean;
    timeOfDay: TimeOfDay;
}

export function useRoomData({ isGuest, timeOfDay }: RoomDataArgs) {
    const room = useQuery(api.rooms.getMyActiveRoom, isGuest ? "skip" : {});
    const guestTemplate = useQuery(api.roomTemplates.getDefault, isGuest ? {} : "skip");
    const guestRoom = useQuery(api.rooms.getDefaultRoom, isGuest ? {} : "skip");
    const user = useQuery(api.users.getMe, isGuest ? "skip" : {});
    const catalogItems = useQuery(api.catalog.list, isGuest ? {} : "skip");
    const computerState = useQuery(api.users.getMyComputer, isGuest ? "skip" : {});

    const backgroundSource = useMemo(() => {
        if (isGuest) return guestTemplate?.backgroundUrl ?? guestRoom?.template?.backgroundUrl;
        if (room?.template?.backgroundUrl) return room.template.backgroundUrl;
        return guestTemplate?.backgroundUrl ?? guestRoom?.template?.backgroundUrl;
    }, [guestRoom?.template?.backgroundUrl, guestTemplate?.backgroundUrl, isGuest, room?.template?.backgroundUrl]);

    const backgroundUrl = useResolvedBackgroundUrl(backgroundSource, timeOfDay);

    const computerCatalogItem = useMemo(() => {
        if (!catalogItems) return null;
        return catalogItems.find((c: (typeof catalogItems)[number]) => c.name === STARTER_COMPUTER_NAME) ?? null;
    }, [catalogItems]);

    const computerStorageId = useMemo(() => {
        if (!computerCatalogItem?.assetUrl?.startsWith("storage:")) return null;
        return computerCatalogItem.assetUrl.replace("storage:", "");
    }, [computerCatalogItem]);

    const computerResolvedUrl = useQuery(
        api.catalog.getImageUrl,
        computerStorageId ? { storageId: computerStorageId as Id<"_storage"> } : "skip"
    );

    const resolvedComputerAssetUrl = useMemo(() => {
        const assetUrl = computerCatalogItem?.assetUrl;
        if (!assetUrl) return null;
        if (assetUrl.startsWith("storage:")) return computerResolvedUrl ?? null;
        return assetUrl;
    }, [computerCatalogItem?.assetUrl, computerResolvedUrl]);

    return {
        room,
        guestTemplate,
        guestRoom,
        user,
        catalogItems,
        computerState,
        backgroundUrl,
        resolvedComputerAssetUrl,
        computerCatalogItem,
    };
}
