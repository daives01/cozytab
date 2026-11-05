import { normalizeRoomItemUrl } from "@shared/roomItemUrl";

/** Revalidate persisted and guest links at the external navigation boundary. */
export function openRoomItemLink(value: string) {
    const url = normalizeRoomItemUrl(value);

    if (url) window.open(url, "_blank", "noopener,noreferrer");
}
