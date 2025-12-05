/**
 * Valid catalog item categories that determine item behavior.
 * - "Furniture" | "Decor": Default behavior (clickable if URL exists)
 * - "Computers": Opens ComputerScreen modal with shortcuts
 * - "Music": Opens MusicPlayerModal for YouTube configuration
 */
export type CatalogItemCategory = "Furniture" | "Decor" | "Computers" | "Music";

export interface RoomItem {
    id: string;
    catalogItemId: string;
    x: number;
    y: number;
    url?: string;
    flipped?: boolean;
    musicUrl?: string;
    musicType?: "youtube";
    // Music sync fields
    musicPlaying?: boolean;
    musicStartedAt?: number;      // timestamp when playback started
    musicPositionAtStart?: number; // seconds into video when started
}

export interface ComputerShortcut {
    id: string;
    name: string;
    url: string;
    row: number;
    col: number;
}

export type { GuestRoomItem, GuestSessionState, GuestShortcut } from "../shared/guestTypes";
