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
    scaleX: number;
    scaleY: number;
    rotation: number;
    zIndex: number;
    url?: string;
    variant?: string;
    musicUrl?: string;
    musicType?: "youtube" | "spotify";
    videoX?: number;
    videoY?: number;
    videoWidth?: number;
    videoHeight?: number;
    videoVisible?: boolean;
    tvRotationAngle?: number; // Isometric rotation angle: 45 or -45 degrees
}

export interface Shortcut {
    id: string;
    name: string;
    url: string;
    icon?: string;
}
