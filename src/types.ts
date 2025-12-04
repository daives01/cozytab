/**
 * Valid catalog item categories that determine item behavior.
 * - "furniture" | "decor": Default behavior (clickable if URL exists)
 * - "computer": Opens ComputerScreen modal with shortcuts
 * - "player": Opens MusicPlayerModal for YouTube configuration
 */
export type CatalogItemCategory = "furniture" | "decor" | "computer" | "player";

export interface RoomItem {
    id: string;
    catalogItemId: string;
    x: number;
    y: number;
    url?: string;
    flipped?: boolean;
    musicUrl?: string;
    musicType?: "youtube" | "spotify";
    // Music sync fields
    musicPlaying?: boolean;
    musicStartedAt?: number;      // timestamp when playback started
    musicPositionAtStart?: number; // seconds into video when started
}

export interface Shortcut {
    id: string;
    name: string;
    url: string;
}
