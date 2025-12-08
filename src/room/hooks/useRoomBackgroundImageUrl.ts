import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { type TimeOfDay } from "../roomConstants";

/**
 * Resolves the room-specific background image for a template.
 * - If the template stores a Convex storage reference (`storage:<id>`), fetch the signed URL.
 * - If missing, fall back to the time-of-day background for the app frame.
 */
export function useRoomBackgroundImageUrl(
    roomTemplateBackgroundUrl: string | undefined,
    _overrideTimeOfDay?: TimeOfDay
) {
    const isStorageUrl = roomTemplateBackgroundUrl?.startsWith("storage:");
    const storageId = isStorageUrl ? roomTemplateBackgroundUrl?.replace("storage:", "") : null;

    const resolvedUrl = useQuery(
        api.catalog.getImageUrl,
        storageId ? { storageId: storageId as Id<"_storage"> } : "skip"
    );

    if (!roomTemplateBackgroundUrl) {
        return "/assets/brown-room.svg";
    }

    if (isStorageUrl) {
        if (resolvedUrl) return resolvedUrl;
        return "/assets/brown-room.svg";
    }

    return roomTemplateBackgroundUrl;
}
