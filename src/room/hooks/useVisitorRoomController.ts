import { useCallback, useMemo, useRef, useState } from "react";
import type { Doc, Id } from "@convex/_generated/dataModel";
import type { Shortcut } from "@shared/guestTypes";
import type { VisitorState } from "@/hooks/useWebSocketPresence";
import { usePresenceAndChat } from "@/presence/usePresenceChat";
import { useTimeOfDayControls } from "@/hooks/useTimeOfDayControls";
import { useRoomBackgroundImageUrl } from "./useRoomBackgroundImageUrl";
import { useVisitorMusic } from "./useVisitorMusic";
import { useVisitorGameState } from "./useVisitorGameState";
import { useVisitorCursorTracking } from "./useVisitorCursorTracking";
import { useCozyCursor } from "./useCozyCursor";
import { useCursorColor } from "./useCursorColor";
import type { VisitorRoomSource } from "../visitorRoomSource";

interface VisitorIdentitySeed {
    id: string;
    name: string;
    cursorColor: string;
    convexUserId?: Id<"users">;
    username?: string;
}

interface VisitorEconomy {
    currency: number;
    nextRewardAt?: number;
    loginStreak?: number;
    guestCoins: number;
    guestInventory: Id<"catalogItems">[];
    onGuestCoinsChange: (coins: number) => void;
    onGuestPurchase: (catalogItemId: Id<"catalogItems">) => void;
}

export interface UseVisitorRoomControllerArgs {
    source: VisitorRoomSource;
    identity: VisitorIdentitySeed;
    catalogItems: Doc<"catalogItems">[] | undefined;
    computerState: { shortcuts: Shortcut[]; cursorColor?: string } | null | undefined;
    isGuest: boolean;
    economy: VisitorEconomy;
    scale: number;
    presenceEnabled?: boolean;
    saveComputer: (computer: { shortcuts: Shortcut[]; cursorColor: string }) => void;
    saveGuestShortcuts?: (shortcuts: Shortcut[]) => void;
    saveGuestCursorColor?: (color: string) => void;
}

export function useVisitorRoomController({
    source,
    identity: identitySeed,
    catalogItems,
    computerState,
    isGuest,
    economy,
    scale,
    presenceEnabled = true,
    saveComputer,
    saveGuestShortcuts,
    saveGuestCursorColor,
}: UseVisitorRoomControllerArgs) {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const [isComputerOpen, setIsComputerOpen] = useState(false);
    const [shortcutsOverride, setShortcutsOverride] = useState<Shortcut[] | null>(null);
    const [cursorColorOverride, setCursorColorOverride] = useState<string | null>(null);
    const [displayNameOverride, setDisplayNameOverride] = useState<string | null>(null);
    const { timeOfDay, overrideTimeOfDay, setOverrideTimeOfDay } = useTimeOfDayControls();

    const identity = useMemo(
        () => ({
            ...identitySeed,
            name: displayNameOverride ?? identitySeed.name,
            cursorColor: cursorColorOverride ?? identitySeed.cursorColor,
        }),
        [cursorColorOverride, displayNameOverride, identitySeed]
    );
    const items = source.room.items;
    const music = useVisitorMusic(items);
    const presence = usePresenceAndChat({
        roomId: presenceEnabled && source.access === "open" ? source.room._id : null,
        identity: {
            id: identity.id,
            name: identity.name,
            cursorColor: identity.cursorColor,
            convexUserId: identity.convexUserId,
        },
        isOwner: false,
    });
    const game = useVisitorGameState({
        items,
        catalogItems,
        isComputerOpen,
        activeMusicItem: music.activeMusicItem,
        setInMenu: presence.setInMenu,
        setInGame: presence.setInGame,
    });
    const cursor = useVisitorCursorTracking({ containerRef, scale, updateCursor: presence.updateCursor });
    const roomBackgroundImageUrl = useRoomBackgroundImageUrl(source.room.template?.backgroundUrl, timeOfDay);
    useCozyCursor(true);
    useCursorColor(identity.cursorColor);

    const shortcuts = useMemo(
        () => shortcutsOverride ?? computerState?.shortcuts ?? [],
        [computerState?.shortcuts, shortcutsOverride]
    );
    const updateShortcuts = useCallback(
        (next: Shortcut[]) => {
            setShortcutsOverride(next);
            if (isGuest) saveGuestShortcuts?.(next);
            else saveComputer({ shortcuts: next, cursorColor: identity.cursorColor });
        },
        [identity.cursorColor, isGuest, saveComputer, saveGuestShortcuts]
    );
    const updateCursorColor = useCallback(
        (next: string) => {
            const color = next.trim();
            if (!color) return;
            setCursorColorOverride(color);
            if (isGuest) saveGuestCursorColor?.(color);
            else saveComputer({ shortcuts, cursorColor: color });
        },
        [isGuest, saveComputer, saveGuestCursorColor, shortcuts]
    );

    return {
        source,
        identity,
        economy,
        catalogItems,
        computerState,
        containerRef,
        scale,
        timeOfDay,
        overrideTimeOfDay,
        setOverrideTimeOfDay,
        roomBackgroundImageUrl,
        isGuest,
        isComputerOpen,
        setIsComputerOpen,
        shortcuts,
        updateShortcuts,
        updateCursorColor,
        setDisplayNameOverride,
        music,
        game,
        presence,
        cursor,
    };
}

export type VisitorRoomController = ReturnType<typeof useVisitorRoomController>;

export function visibleComputerVisitors(visitors: VisitorState[], visitorId: string) {
    return visitors.filter((visitor) => visitor.convexUserId && visitor.visitorId !== visitorId);
}
