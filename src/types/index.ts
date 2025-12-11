import type { Doc } from "@convex/_generated/dataModel";

type UserComputer = NonNullable<Doc<"users">["computer"]>;

/**
 * Valid catalog item categories that determine item behavior.
 * - "Furniture" | "Decor": Default behavior (clickable if URL exists)
 * - "Computers": Opens ComputerScreen modal with shortcuts
 * - "Music": Opens MusicPlayerModal for YouTube configuration
 */
export type CatalogItemCategory = "Furniture" | "Decor" | "Computers" | "Music";

export type RoomItem = Doc<"rooms">["items"][number];
export type ComputerShortcut = UserComputer["shortcuts"][number];

export type { GuestRoomItem, GuestSessionState, GuestShortcut } from "@shared/guestTypes";
export type { TimeOfDay, DailyRewardState, DailyRewardToastPayload, RewardPayload } from "../room/types";
export type { ComputerOverlayProps, ComputerScreenProps, ComputerWindowApp, ContextMenuState } from "../computer/types";
export type {
    MusicNotesOverlayProps,
    MusicPlayerButtonsProps,
    MusicPlayerModalProps,
    VisitorMusicModalProps,
} from "../musicPlayer/types";
