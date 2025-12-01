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
}

export interface Shortcut {
    id: string;
    name: string;
    url: string;
    icon?: string;
}
