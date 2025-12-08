import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { BASE_BACKGROUND_DAY, BASE_BACKGROUND_NIGHT, ROOM_FALLBACK_BACKGROUND, type TimeOfDay } from "../roomConstants";

export function useResolvedBackgroundUrl(backgroundUrl: string | undefined, overrideTimeOfDay?: TimeOfDay) {
    const isStorageUrl = backgroundUrl?.startsWith("storage:");
    const storageId = isStorageUrl ? backgroundUrl?.replace("storage:", "") : null;

    const resolvedUrl = useQuery(
        api.catalog.getImageUrl,
        storageId ? { storageId: storageId as Id<"_storage"> } : "skip"
    );

    if (!backgroundUrl) {
        if (overrideTimeOfDay) {
            return overrideTimeOfDay === "day" ? BASE_BACKGROUND_DAY : BASE_BACKGROUND_NIGHT;
        }
        return ROOM_FALLBACK_BACKGROUND;
    }
    if (isStorageUrl) return resolvedUrl ?? ROOM_FALLBACK_BACKGROUND;
    return backgroundUrl;
}
