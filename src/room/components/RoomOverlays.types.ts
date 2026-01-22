import type { RoomItem, Shortcut } from "@/types";
import type { Id } from "@convex/_generated/dataModel";
import type { DailyRewardToastPayload, TimeOfDay } from "../types";
import type { GuestDrawerItem } from "../AssetDrawer/types";
import type { VisitorState } from "@/hooks/useWebSocketPresence";
import type { OnboardingStep } from "../Onboarding";

export interface DrawerProps {
    offset: number;
    orientation: "left" | "bottom";
    isOpen: boolean;
    onToggle: () => void;
}

export interface EconomyProps {
    userCurrency: number;
    nextRewardAt?: number;
    loginStreak?: number;
    guestCoins: number;
    onGuestCoinsChange: (coins: number | ((prev: number) => number)) => void;
    startingCoins: number;
    guestInventory: Id<"catalogItems">[];
    onGuestPurchase: (itemId: Id<"catalogItems">) => void;
}

export interface ProfileProps {
    displayName?: string;
    username?: string;
    onDisplayNameUpdated?: (next: string | null) => void;
    cursorColor: string;
    onCursorColorChange: (next: string) => void;
}

export interface TimeProps {
    timeOfDay: TimeOfDay;
    devTimeOfDay: TimeOfDay | null;
    onSetDevTimeOfDay: (next: TimeOfDay | null) => void;
}

export interface OnboardingCallbacksProps {
    onShopOpened: () => void;
    onOnboardingPurchase: () => void;
    isOnboardingShopStep: boolean;
    onOnboardingShortcutAdded: () => void;
    highlightFirstMusicItem: boolean;
}

export interface ComputerProps {
    isOpen: boolean;
    onClose: () => void;
    shortcuts: Shortcut[];
    onUpdateShortcuts: (shortcuts: Shortcut[]) => void;
    economy: EconomyProps;
    profile: ProfileProps;
    time: TimeProps;
    onboardingCallbacks: OnboardingCallbacksProps;
    onPointerMove: (x: number, y: number) => void;
}

export interface MusicProps {
    musicPlayerItemId: string | null;
    localItems: RoomItem[];
    onSave: (updatedItem: RoomItem, updatedItems: RoomItem[]) => void;
    onClose: () => void;
}

export interface OnboardingProps {
    active: boolean;
    step: OnboardingStep | null;
    onAdvance: () => void;
    onComplete: () => void;
    dailyRewardToast: DailyRewardToastPayload | null;
    stripeSuccessToast?: boolean;
    onCloseStripeSuccessToast?: () => void;
}

export interface PresenceProps {
    hasVisitors: boolean;
    isComputerOpenState: boolean;
    isShareModalOpen: boolean;
    onCloseShareModal: () => void;
    updateChatMessage: (msg: string | null) => void;
    localChatMessage: string | null;
    screenCursor: { x: number; y: number };
    connectionState: "connecting" | "connected" | "reconnecting";
}

export interface GameProps {
    activeGameItemId: string | null;
    onClose: () => void;
    onGameActiveChange: (gameItemId: string | null) => void;
    visitorId: string;
    visitors: VisitorState[];
    setGameMetadata: (metadata: Record<string, unknown> | null) => void;
}

export interface UIProps {
    isGuest: boolean;
    mode: "view" | "edit";
    shareAllowed: boolean;
    visitorCount: number;
    drawer: DrawerProps;
    draggedItemId: string | null;
    highlightComputer: boolean;
    guestItems?: GuestDrawerItem[];
    placedCatalogItemIds: Id<"catalogItems">[];
    onToggleMode: () => void;
    onShareClick: () => void;
    onDeleteItem: (id: string) => void;
}

export interface RoomOverlaysProps {
    ui: UIProps;
    computer: ComputerProps;
    music: MusicProps;
    onboarding: OnboardingProps;
    presence: PresenceProps;
    game: GameProps;
}
