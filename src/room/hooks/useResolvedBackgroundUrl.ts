import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { getLocalTimeOfDayBackground } from "../roomConstants";

export function useResolvedBackgroundUrl(backgroundUrl: string | undefined) {
    const isStorageUrl = backgroundUrl?.startsWith("storage:");
    const storageId = isStorageUrl ? backgroundUrl?.replace("storage:", "") : null;

    const resolvedUrl = useQuery(
        api.catalog.getImageUrl,
        storageId ? { storageId: storageId as Id<"_storage"> } : "skip"
    );

    if (!backgroundUrl) return getLocalTimeOfDayBackground();
    if (isStorageUrl) return resolvedUrl ?? undefined;
    return backgroundUrl;
}
