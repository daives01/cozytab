import { useCallback } from "react";
import type { DragEvent } from "react";
import type { ComputerShortcut, RoomItem } from "@/types";
import type { Id } from "@convex/_generated/dataModel";
import type { OnboardingStep } from "../Onboarding";
import { ROOM_HEIGHT, ROOM_WIDTH } from "@/time/roomConstants";
import {
    addDroppedItem,
    bringItemToFront,
    clampCursorToRoom,
    clampItemPosition,
    sendItemToBack,
    updateItemsForMusicToggle,
} from "../utils/roomActions";

type HandlersArgs = {
    isGuest: boolean;
    mode: "view" | "edit";
    roomId: Id<"rooms"> | null;
    containerRef: React.RefObject<HTMLDivElement | null>;
    scale: number;
    lastRoomPositionRef: React.MutableRefObject<{ x: number; y: number }>;
    hasVisitors: boolean;
    onboardingStep: OnboardingStep | null;
    advanceOnboarding: () => void;
    computerGuardAllowOpen: boolean;
    setLocalItems: (updater: (prev: RoomItem[]) => RoomItem[]) => void;
    setSelectedId: (update: string | null | ((prev: string | null) => string | null)) => void;
    setDraggedItemId: (id: string | null) => void;
    setIsComputerOpen: (next: boolean) => void;
    setMusicPlayerItemId: (id: string | null) => void;
    setIsDrawerOpen: (next: boolean | ((prev: boolean) => boolean)) => void;
    setMode: (next: "view" | "edit") => void;
    updateCursor: (x: number, y: number, clientX: number, clientY: number, hasVisitors: boolean) => void;
    saveRoom: (args: { roomId: Id<"rooms">; items: RoomItem[] }) => void;
    updateGuestShortcuts: (next: ComputerShortcut[]) => void;
    saveComputer: (args: { shortcuts: ComputerShortcut[]; cursorColor: string }) => void;
    cursorColor: string;
    canPlaceItem: (catalogItemId: Id<"catalogItems">) => boolean;
};

export function useRoomHandlers({
    isGuest,
    mode,
    roomId,
    containerRef,
    scale,
    lastRoomPositionRef,
    hasVisitors,
    onboardingStep,
    advanceOnboarding,
    computerGuardAllowOpen,
    setLocalItems,
    setSelectedId,
    setDraggedItemId,
    setIsComputerOpen,
    setMusicPlayerItemId,
    setIsDrawerOpen,
    setMode,
    updateCursor,
    saveRoom,
    updateGuestShortcuts,
    saveComputer,
    cursorColor,
    canPlaceItem,
}: HandlersArgs) {
    const handleMusicToggle = useCallback(
        (itemId: string, playing: boolean) => {
            const now = Date.now();
            setLocalItems((prev) => {
                const next = updateItemsForMusicToggle(prev, itemId, playing, now);
                if (!isGuest && roomId && mode === "view") {
                    saveRoom({ roomId, items: next });
                }
                return next;
            });
        },
        [isGuest, mode, roomId, saveRoom, setLocalItems]
    );

    const handleModeToggle = useCallback(() => {
        if (mode === "edit") {
            setMode("view");
            setIsDrawerOpen(false);
            if (onboardingStep === "switch-to-view") {
                advanceOnboarding();
            }
        } else {
            setMode("edit");
            setIsDrawerOpen(true);
            if (onboardingStep === "enter-edit-mode") {
                advanceOnboarding();
            }
        }
    }, [advanceOnboarding, mode, onboardingStep, setIsDrawerOpen, setMode]);

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
            if (!containerRef.current) return;
            if (!canPlaceItem(catalogItemId as Id<"catalogItems">)) return;

            const rect = containerRef.current.getBoundingClientRect();
            const relativeX = e.clientX - rect.left;
            const relativeY = e.clientY - rect.top;
            const isInsideRoom =
                relativeX >= 0 && relativeX <= rect.width && relativeY >= 0 && relativeY <= rect.height;

            if (!isInsideRoom) return;

            const x = relativeX / scale;
            const y = relativeY / scale;

            setLocalItems((prev) => addDroppedItem(prev, catalogItemId as Id<"catalogItems">, x, y));

            if (onboardingStep === "place-computer") {
                advanceOnboarding();
            }
        },
        [advanceOnboarding, canPlaceItem, containerRef, mode, onboardingStep, scale, setLocalItems]
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
        [containerRef, hasVisitors, lastRoomPositionRef, scale, updateCursor]
    );

    const handleBackgroundClick = useCallback(() => setSelectedId(null), [setSelectedId]);

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
        [mode, setMusicPlayerItemId]
    );

    const handleUpdateShortcuts = useCallback(
        (shortcuts: ComputerShortcut[]) => {
            if (isGuest) {
                updateGuestShortcuts(shortcuts);
            } else {
                saveComputer({ shortcuts, cursorColor });
            }
        },
        [cursorColor, isGuest, saveComputer, updateGuestShortcuts]
    );

    const handleSelectItem = useCallback((id: string | null) => setSelectedId(id), [setSelectedId]);

    const handleChangeItem = useCallback(
        (newItem: RoomItem) => {
            setLocalItems((prev) => prev.map((i) => (i.id === newItem.id ? clampItemPosition(newItem) : i)));
        },
        [setLocalItems]
    );

    const handleDragStart = useCallback((id: string) => setDraggedItemId(id), [setDraggedItemId]);
    const handleDragEnd = useCallback(() => setDraggedItemId(null), [setDraggedItemId]);

    const handleBringToFront = useCallback(
        (id: string) => setLocalItems((prev) => bringItemToFront(prev, id)),
        [setLocalItems]
    );
    const handleSendToBack = useCallback(
        (id: string) => setLocalItems((prev) => sendItemToBack(prev, id)),
        [setLocalItems]
    );

    const handleDeleteItem = useCallback(
        (itemId: string) => {
            setLocalItems((prev) => prev.filter((item) => item.id !== itemId));
            setSelectedId((current) => (current === itemId ? null : current));
        },
        [setLocalItems, setSelectedId]
    );

    return {
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

