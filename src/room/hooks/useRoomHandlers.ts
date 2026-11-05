import { useCallback } from "react";
import type { DragEvent } from "react";
import type { Shortcut, RoomItem } from "@shared/guestTypes";
import type { Id } from "@convex/_generated/dataModel";
import type { OnboardingStep } from "../Onboarding";
import type { RoomEditingSession } from "../session";
import { ROOM_HEIGHT, ROOM_WIDTH } from "@/time/roomConstants";
import { clampCursorToRoom, updateItemsForMusicToggle } from "../utils/roomActions";

type HandlersArgs = {
    isGuest: boolean;
    mode: "view" | "edit";
    editingSession: RoomEditingSession;
    containerRef: React.RefObject<HTMLDivElement | null>;
    scale: number;
    lastRoomPositionRef: React.MutableRefObject<{ x: number; y: number }>;
    hasVisitors: boolean;
    onboardingStep: OnboardingStep | null;
    advanceOnboarding: () => void;
    computerGuardAllowOpen: boolean;
    setIsComputerOpen: (next: boolean) => void;
    setMusicPlayerItemId: (id: string | null) => void;
    setIsDrawerOpen: (next: boolean | ((prev: boolean) => boolean)) => void;
    updateCursor: (x: number, y: number, clientX: number, clientY: number, hasVisitors: boolean) => void;
    updateGuestShortcuts: (next: Shortcut[]) => void;
    saveComputer: (args: { shortcuts: Shortcut[]; cursorColor: string }) => void;
    cursorColor: string;
};

export function useRoomHandlers({
    isGuest,
    mode,
    editingSession,
    containerRef,
    scale,
    lastRoomPositionRef,
    hasVisitors,
    onboardingStep,
    advanceOnboarding,
    computerGuardAllowOpen,
    setIsComputerOpen,
    setMusicPlayerItemId,
    setIsDrawerOpen,
    updateCursor,
    updateGuestShortcuts,
    saveComputer,
    cursorColor,
}: HandlersArgs) {
    const handlePlaceCatalogItem = useCallback(
        (catalogItemId: Id<"catalogItems">, clientX: number, clientY: number) => {
            if (mode !== "edit") return;
            if (!containerRef.current) return;

            const rect = containerRef.current.getBoundingClientRect();
            const relativeX = clientX - rect.left;
            const relativeY = clientY - rect.top;
            const isInsideRoom =
                relativeX >= 0 && relativeX <= rect.width && relativeY >= 0 && relativeY <= rect.height;

            if (!isInsideRoom) return;

            const x = relativeX / scale;
            const y = relativeY / scale;

            const result = editingSession.place({ catalogItemId, x, y });
            if (!result.accepted) return;

            if (onboardingStep === "place-computer") {
                advanceOnboarding();
            }
        },
        [advanceOnboarding, containerRef, editingSession, mode, onboardingStep, scale],
    );

    const handleMusicToggle = useCallback(
        (itemId: string, playing: boolean) => {
            const now = Date.now();
            const current = editingSession.getSnapshot().items;
            const updated = updateItemsForMusicToggle(current, itemId, playing, now).find((item) => item.id === itemId);
            if (!updated) return;
            const changes: Partial<RoomItem> = { ...updated };
            delete changes.id;
            delete changes.catalogItemId;
            editingSession.changePersistedItem(itemId, changes, "visitor-observable");
        },
        [editingSession],
    );

    const handleModeToggle = useCallback(() => {
        if (mode === "edit") {
            editingSession.exitEditMode();
            setIsDrawerOpen(false);
            if (onboardingStep === "switch-to-view") {
                advanceOnboarding();
            }
        } else {
            editingSession.enterEditMode();
            setIsDrawerOpen(true);
            if (onboardingStep === "enter-edit-mode") {
                advanceOnboarding();
            }
        }
    }, [advanceOnboarding, editingSession, mode, onboardingStep, setIsDrawerOpen]);

    const handleDrawerToggle = useCallback(() => setIsDrawerOpen((prev) => !prev), [setIsDrawerOpen]);

    const handleDrop = useCallback(
        (e: DragEvent) => {
            e.preventDefault();
            if (mode !== "edit") return;

            if (e.target instanceof HTMLElement && e.target.closest("[data-asset-drawer]")) {
                return;
            }

            const catalogItemId = e.dataTransfer.getData("catalogItemId");
            if (!catalogItemId) return;
            handlePlaceCatalogItem(catalogItemId as Id<"catalogItems">, e.clientX, e.clientY);
        },
        [handlePlaceCatalogItem, mode],
    );

    const handleCursorMove = useCallback(
        (clientX: number, clientY: number) => {
            const rect = containerRef.current?.getBoundingClientRect();
            const clamped = clampCursorToRoom({
                clientX,
                clientY,
                rect,
                scale,
                roomWidth: ROOM_WIDTH,
                roomHeight: ROOM_HEIGHT,
                lastPosition: lastRoomPositionRef.current,
            });
            lastRoomPositionRef.current = clamped;
            updateCursor(clamped.x, clamped.y, clientX, clientY, hasVisitors);
        },
        [containerRef, hasVisitors, lastRoomPositionRef, scale, updateCursor],
    );

    const handleBackgroundClick = useCallback(() => editingSession.select(null), [editingSession]);

    const handleComputerClick = useCallback(() => {
        if (mode !== "view") return;
        if (!computerGuardAllowOpen) return;
        setIsComputerOpen(true);
        if (onboardingStep === "click-computer") {
            advanceOnboarding();
        }
    }, [advanceOnboarding, computerGuardAllowOpen, mode, onboardingStep, setIsComputerOpen]);

    const handleMusicPlayerClick = useCallback(
        (id: string) => {
            if (mode === "view") {
                setMusicPlayerItemId(id);
            }
        },
        [mode, setMusicPlayerItemId],
    );

    const handleUpdateShortcuts = useCallback(
        (shortcuts: Shortcut[]) => {
            if (isGuest) {
                updateGuestShortcuts(shortcuts);
            } else {
                saveComputer({ shortcuts, cursorColor });
            }
        },
        [cursorColor, isGuest, saveComputer, updateGuestShortcuts],
    );

    const handleSelectItem = useCallback((id: string | null) => editingSession.select(id), [editingSession]);

    const handleChangeItem = useCallback(
        (newItem: RoomItem) => {
            const changes: Partial<RoomItem> = { ...newItem };
            delete changes.id;
            delete changes.catalogItemId;
            const id = newItem.id;
            editingSession.changePersistedItem(id, changes);
        },
        [editingSession],
    );

    const handleDragStart = useCallback(
        (id: string) => {
            editingSession.beginDrag(id);
        },
        [editingSession],
    );
    const handleDragEnd = useCallback(() => editingSession.endDrag(), [editingSession]);

    const handleBringToFront = useCallback(
        (id: string) => {
            editingSession.bringToFront(id);
        },
        [editingSession],
    );
    const handleSendToBack = useCallback(
        (id: string) => {
            editingSession.sendToBack(id);
        },
        [editingSession],
    );

    const handleDeleteItem = useCallback(
        (itemId: string) => {
            editingSession.remove(itemId);
        },
        [editingSession],
    );

    return {
        handlePlaceCatalogItem,
        handleMusicToggle,
        handleModeToggle,
        handleDrawerToggle,
        handleDrop,
        handleCursorMove,
        handleBackgroundClick,
        handleComputerClick,
        handleMusicPlayerClick,
        handleUpdateShortcuts,
        handleSelectItem,
        handleChangeItem,
        handleDragStart,
        handleDragEnd,
        handleBringToFront,
        handleSendToBack,
        handleDeleteItem,
    };
}
