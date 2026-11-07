import { isComputerTypingTarget } from "./keyboardTarget";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Shortcut } from "@shared/guestTypes";
import type { Id, Doc } from "@convex/_generated/dataModel";
import { GUEST_STARTING_COINS } from "@shared/guestTypes";
import { WindowFrame } from "./WindowFrame";
import { ComputerWindowContent } from "./ComputerWindowContent";
import { editInteraction, toggleInteraction, type DesktopInteraction } from "./desktopInteraction";
import { DesktopGrid } from "./DesktopGrid";
import { InlineAddPrompt } from "./InlineAddPrompt";
import { DesktopContextMenu } from "./DesktopContextMenu";
import { Taskbar, WindowHeader } from "./Taskbar";
import { VolumePanel } from "./VolumePanel";
import { useKeyboardSoundPreferences } from "../hooks/useKeyboardSoundSetting";
import {
    GRID_COLUMNS,
    ROW_HEIGHT,
    DESKTOP_PADDING_Y,
    WINDOW_ACCENTS,
    deriveShortcutName,
    findCellFromPoint,
    findNearestCell,
    formatTime,
    normalizeShortcuts,
    withProtocol,
} from "./desktopUtils";
import { useWindowManager } from "./useWindowManager";
import { useComputerDevActions, useComputerProfileActions } from "./useComputerActions";
import type { TimeOfDay } from "../room/types";

export interface ComputerScreenProps {
    shortcuts: Shortcut[];
    onClose: () => void;
    onUpdateShortcuts: (shortcuts: Shortcut[]) => void;
    userCurrency: number;
    nextRewardAt?: number;
    loginStreak?: number;
    onShopOpened?: () => void;
    onOnboardingPurchase?: () => void;
    onOnboardingShortcutAdded?: () => void;
    isOnboardingShopStep?: boolean; // For onboarding highlighting
    onPointerMove?: (clientX: number, clientY: number) => void;
    isGuest?: boolean;
    guestCoins?: number;
    onGuestCoinsChange?: (coins: number) => void;
    startingCoins?: number;
    guestInventory?: Id<"catalogItems">[];
    onGuestPurchase?: (catalogItemId: Id<"catalogItems">) => void;
    highlightFirstMusicItem?: boolean;
    displayName?: string;
    username?: string;
    onDisplayNameUpdated?: (next: string) => void;
    cursorColor?: string;
    onCursorColorChange?: (next: string) => void;
    timeOfDay: TimeOfDay;
    devTimeOfDay: TimeOfDay | null;
    onSetDevTimeOfDay: (value: TimeOfDay | null) => void;
    inRoomVisitors?: import("@/hooks/useWebSocketPresence").VisitorState[];
    canSwitchRooms: boolean;
    saveStatus?: import("@/room/session/types").RoomSaveStatus;
    saveError?: string | null;
    onRetrySave?: () => Promise<void>;
}

import { createId } from "@/utils/id";

export function ComputerScreen({
    shortcuts,
    onClose,
    onUpdateShortcuts,
    userCurrency,
    nextRewardAt,
    loginStreak,
    onShopOpened,
    onOnboardingPurchase,
    onOnboardingShortcutAdded,
    isOnboardingShopStep,
    onPointerMove,
    isGuest = false,
    guestCoins,
    onGuestCoinsChange,
    startingCoins = GUEST_STARTING_COINS,
    guestInventory,
    onGuestPurchase,
    highlightFirstMusicItem = false,
    displayName,
    username,
    onDisplayNameUpdated,
    cursorColor,
    onCursorColorChange,
    timeOfDay,
    devTimeOfDay,
    onSetDevTimeOfDay,
    inRoomVisitors,
    canSwitchRooms,
    saveStatus,
    saveError,
    onRetrySave,
}: ComputerScreenProps) {
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [interaction, setInteraction] = useState<DesktopInteraction>({ kind: "idle" });
    const draggingId = interaction.kind === "drag" ? interaction.id : null;
    const renamingId = interaction.kind === "rename" ? interaction.id : null;
    const inlineAddPrompt = interaction.kind === "add" ? interaction : null;
    const contextMenu = interaction.kind === "context" ? interaction.menu : null;
    const isStartMenuOpen = interaction.kind === "start";
    const isVolumePanelOpen = interaction.kind === "volume";

    const [now, setNow] = useState(() => new Date());
    const [desktopScale, setDesktopScale] = useState(1);
    const desktopRef = useRef<HTMLDivElement>(null);
    const dragImageRef = useRef<HTMLDivElement | null>(null);

    const {
        volume: keyboardVolume,
        musicVolume,
        setVolume: setKeyboardVolume,
        setMusicVolume,
    } = useKeyboardSoundPreferences();

    const isDevEnv = import.meta.env.DEV;
    const { signOut, deleteUser: handleDevDeleteUser, resetStorage: handleDevResetStorage } = useComputerDevActions();

    const { currentDisplayName, isSavingDisplayName, displayNameError, handleSaveDisplayName } =
        useComputerProfileActions({ displayName, username, onDisplayNameUpdated });

    const pendingFriendRequestCount = useQuery(api.friends.getPendingRequestCount, isGuest ? "skip" : undefined);

    const myRooms = useQuery(api.rooms.getMyRooms, isGuest ? "skip" : undefined);
    const setActiveRoom = useMutation(api.rooms.setActiveRoom);
    const [switchingRoom, setSwitchingRoom] = useState<Id<"rooms"> | null>(null);

    const desktopShortcuts = useMemo(() => normalizeShortcuts(shortcuts), [shortcuts]);

    const orderedShortcuts = useMemo(
        () => [...desktopShortcuts].sort((a, b) => (a.row === b.row ? a.col - b.col : a.row - b.row)),
        [desktopShortcuts],
    );

    const maxRowIndex = orderedShortcuts.reduce((max, s) => Math.max(max, s.row), 0);
    const gridHeight = (Math.max(0, maxRowIndex) + 1) * ROW_HEIGHT;

    const recomputeScale = useCallback(() => {
        if (!desktopRef.current) return;
        const availableHeight = desktopRef.current.clientHeight - DESKTOP_PADDING_Y;

        if (availableHeight <= 0) {
            setDesktopScale(1);

            return;
        }

        const scale = Math.min(1, availableHeight / gridHeight);
        setDesktopScale(scale);
    }, [gridHeight]);

    const handleOpenShortcut = (shortcut: Shortcut) => {
        window.open(shortcut.url, "_blank", "noopener,noreferrer");
    };

    useEffect(() => {
        const interval = setInterval(() => setNow(new Date()), 30_000);

        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        recomputeScale();
    }, [recomputeScale, orderedShortcuts]);

    useEffect(() => {
        const onResize = () => recomputeScale();
        window.addEventListener("resize", onResize);

        return () => window.removeEventListener("resize", onResize);
    }, [recomputeScale]);

    const forwardPointerMove = useCallback(
        (clientX: number, clientY: number) => {
            if (!onPointerMove) return;
            onPointerMove(clientX, clientY);
        },
        [onPointerMove],
    );

    const { windows, activeWindowId, openWindow, closeWindow, bringToFront, startDragWindow, startResizeWindow } =
        useWindowManager({ desktopRef, onPointerMove: forwardPointerMove, onShopOpened });

    const normalizeAndSave = useCallback(
        (next: Shortcut[]) => {
            const normalized = normalizeShortcuts(next);
            onUpdateShortcuts(normalized);
        },
        [onUpdateShortcuts],
    );

    const dismissInteraction = useCallback(() => {
        setInteraction({ kind: "idle" });
    }, []);

    const cleanupDragImage = useCallback(() => {
        if (dragImageRef.current) {
            dragImageRef.current.remove();
            dragImageRef.current = null;
        }
    }, []);

    useEffect(() => () => cleanupDragImage(), [cleanupDragImage]);

    const createDragImage = useCallback(
        (event: React.DragEvent<HTMLDivElement>) => {
            cleanupDragImage();

            const target = event.currentTarget;
            const rect = target.getBoundingClientRect();
            const scale = desktopScale;

            const clone = target.cloneNode(true);

            if (!(clone instanceof HTMLDivElement)) return;
            clone.style.position = "absolute";
            clone.style.top = "-9999px";
            clone.style.left = "-9999px";
            clone.style.transform = `scale(${scale})`;
            clone.style.transformOrigin = "top left";
            clone.style.pointerEvents = "none";
            document.body.appendChild(clone);
            dragImageRef.current = clone;

            const offsetX = (event.clientX - rect.left) / scale;
            const offsetY = (event.clientY - rect.top) / scale;
            event.dataTransfer.setDragImage(clone, offsetX, offsetY);
        },
        [cleanupDragImage, desktopScale],
    );

    const handleAddShortcutInline = () => {
        if (interaction.kind !== "add" || !interaction.value.trim()) return;

        const url = withProtocol(interaction.value.trim());
        const { row, col } = interaction;
        const newId = createId();
        const initialName = deriveShortcutName(url);

        const newShortcut: Shortcut = {
            id: newId,
            name: initialName,
            url,
            row,
            col,
        };

        normalizeAndSave([...desktopShortcuts, newShortcut]);
        setSelectedId(newId);
        setInteraction({ kind: "rename", id: newId, value: initialName });
        onOnboardingShortcutAdded?.();
    };

    const handleDeleteShortcut = useCallback(
        (id: string) => {
            normalizeAndSave(desktopShortcuts.filter((s) => s.id !== id));
            setInteraction({ kind: "idle" });
        },
        [desktopShortcuts, normalizeAndSave],
    );

    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => {
            const target = e.target;

            const isTypingTarget = isComputerTypingTarget(target);

            if (e.key === "Escape") {
                setInteraction({ kind: "idle" });

                onClose();

                return;
            }

            if (isTypingTarget || renamingId || draggingId || inlineAddPrompt) return;
            const selected = desktopShortcuts.find((s) => s.id === selectedId);
            if (!selected) return;

            switch (e.key) {
                case "Enter":
                    e.preventDefault();
                    setInteraction({ kind: "idle" });
                    handleOpenShortcut(selected);
                    break;
                case "Backspace":
                case "Delete":
                    e.preventDefault();
                    handleDeleteShortcut(selected.id);
                    break;
            }
        };

        window.addEventListener("keydown", handleKey);

        return () => window.removeEventListener("keydown", handleKey);
    }, [
        dismissInteraction,
        desktopShortcuts,
        draggingId,
        handleDeleteShortcut,
        inlineAddPrompt,
        onClose,
        renamingId,
        selectedId,
    ]);

    function commitRename(id: string) {
        const target = desktopShortcuts.find((s) => s.id === id);

        if (!target) {
            dismissInteraction();

            return;
        }

        if (interaction.kind !== "rename" || interaction.id !== id) return;
        const trimmedName = interaction.value.trim();

        if (!trimmedName) {
            dismissInteraction();

            return;
        }

        normalizeAndSave(desktopShortcuts.map((s) => (s.id === id ? { ...s, name: trimmedName } : s)));
        setSelectedId(id);
        dismissInteraction();
    }

    const startRename = (id: string) => {
        const target = desktopShortcuts.find((s) => s.id === id);

        if (!target) return;
        setSelectedId(id);
        setInteraction({ kind: "rename", id, value: target.name });
    };

    const handleSwitchRoom = async (roomId: Id<"rooms">, windowId?: string) => {
        if (isGuest) return;

        if (!canSwitchRooms) return;

        if (!myRooms || myRooms.length <= 1) return;
        const targetRoom = myRooms.find((room: Doc<"rooms">) => room._id === roomId);

        if (!targetRoom || targetRoom.isActive) return;
        setSwitchingRoom(roomId);

        try {
            await setActiveRoom({ roomId });

            if (windowId) {
                closeWindow(windowId);
            }

            onClose();
        } catch (error) {
            console.error("Failed to switch room:", error);
        } finally {
            setSwitchingRoom(null);
        }
    };

    const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();

        if (!draggingId || !desktopRef.current) return;

        forwardPointerMove(event.clientX, event.clientY);
        const { row, col } = findNearestCell(event, desktopRef.current, desktopScale);

        const updated = desktopShortcuts.map((s) => (s.id === draggingId ? { ...s, row, col } : s));

        normalizeAndSave(updated);
        cleanupDragImage();
        setInteraction({ kind: "idle" });
    };

    const startShortcutDrag = (event: React.DragEvent<HTMLDivElement>, shortcut: Shortcut) => {
        event.dataTransfer.setData("text/plain", shortcut.id);
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.dropEffect = "move";
        createDragImage(event);
        setInteraction({ kind: "drag", id: shortcut.id });
        document.documentElement.classList.add("cozy-cursor-drag");
    };

    const endShortcutDrag = () => {
        setInteraction({ kind: "idle" });
        cleanupDragImage();
        document.documentElement.classList.remove("cozy-cursor-drag");
    };

    const handleDesktopClick = () => {
        setSelectedId(null);
        setInteraction({ kind: "idle" });
    };

    const toggleStartMenu = () => setInteraction((state) => toggleInteraction(state, "start"));
    const closeStartMenu = dismissInteraction;

    const handleContextMenuOpen = (event: React.MouseEvent, shortcut: Shortcut) => {
        event.preventDefault();
        event.stopPropagation();
        setSelectedId(shortcut.id);
        setInteraction({
            kind: "context",
            menu: { target: "shortcut", id: shortcut.id, x: event.clientX, y: event.clientY },
        });
    };

    const handleDesktopContextMenu = (event: React.MouseEvent<HTMLDivElement>) => {
        event.preventDefault();
        const target = event.target;

        if (target instanceof Element && target.closest("[data-window]")) return;

        if (!desktopRef.current) return;
        const { row, col } = findCellFromPoint(event.clientX, event.clientY, desktopRef.current, desktopScale);
        setSelectedId(null);
        setInteraction({
            kind: "context",
            menu: {
                target: "desktop",
                x: event.clientX,
                y: event.clientY,
                row,
                col,
            },
        });
    };

    const toggleVolumePanel = () => setInteraction((state) => toggleInteraction(state, "volume"));
    const closeVolumePanel = dismissInteraction;

    const startAddAtCell = (row: number, col: number, x: number, y: number) => {
        setInteraction({ kind: "add", row, col, x, y, value: "" });
        setSelectedId(null);
    };

    const shopWindowProps = {
        userCurrency,
        nextRewardAt,
        loginStreak,
        onOnboardingPurchase,
        isGuest,
        guestCoins,
        onGuestCoinsChange,
        startingCoins,
        guestOwnedIds: guestInventory,
        onGuestPurchase,
        highlightFirstMusicItem,
    };

    return (
        <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center font-['Patrick_Hand']"
            onClick={onClose}
        >
            <div
                className="relative rounded-3xl p-4 shadow-2xl border-b-8 border-r-8"
                style={{
                    width: "min(1300px, 98vw)",
                    height: "min(92vh, 880px)",
                    background: "linear-gradient(180deg, var(--taskbar-to), var(--taskbar-from))",
                    borderColor: "var(--taskbar-border)",
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-[color-mix(in_srgb,var(--taskbar-from)_80%,transparent)] px-4 py-1 rounded-t-lg">
                    <span className="text-[var(--ink-subtle)] font-bold text-[10px] uppercase tracking-[0.2em]">
                        COZYSYS 98
                    </span>
                    <div className="w-2 h-2 rounded-full bg-[var(--success)] shadow-[var(--glow-success)] animate-pulse" />
                </div>

                <div
                    className="rounded-xl p-1 h-full shadow-inner relative border-2"
                    style={{
                        backgroundColor: "color-mix(in srgb, var(--ink) 85%, black)",
                        borderColor: "color-mix(in srgb, var(--ink) 40%, transparent)",
                    }}
                >
                    <div className="w-full h-full bg-[var(--retro-screen)] flex flex-col relative">
                        <WindowHeader onClose={onClose} />

                        <div
                            ref={desktopRef}
                            data-onboarding="shortcut-desktop"
                            className="flex-1 relative overflow-hidden p-4"
                            style={{
                                backgroundImage:
                                    "linear-gradient(90deg, var(--grid-line) 1px, transparent 1px), linear-gradient(var(--grid-line) 1px, transparent 1px)",
                                backgroundSize: "120px 120px",
                            }}
                            onClick={handleDesktopClick}
                            onDragOver={(e) => {
                                e.preventDefault();
                                forwardPointerMove(e.clientX, e.clientY);
                            }}
                            onDrop={handleDrop}
                            onPointerMove={(e) => {
                                if (e.pointerType !== "touch") return;
                                const target = e.target;

                                if (
                                    target instanceof HTMLElement &&
                                    (target.tagName === "INPUT" ||
                                        target.tagName === "TEXTAREA" ||
                                        target.isContentEditable)
                                ) {
                                    return;
                                }

                                forwardPointerMove(e.clientX, e.clientY);
                            }}
                            onContextMenu={handleDesktopContextMenu}
                        >
                            <DesktopGrid
                                orderedShortcuts={orderedShortcuts}
                                selectedId={selectedId}
                                interaction={interaction}
                                desktopScale={desktopScale}
                                gridHeight={gridHeight}
                                columns={GRID_COLUMNS}
                                rowHeight={ROW_HEIGHT}
                                onSelect={(id) => {
                                    setSelectedId(id);
                                    setInteraction({ kind: "idle" });
                                }}
                                onDoubleClick={handleOpenShortcut}
                                onContextMenu={handleContextMenuOpen}
                                onDragStart={startShortcutDrag}
                                onDragEnd={endShortcutDrag}
                                onRenameChange={(value) => setInteraction((state) => editInteraction(state, value))}
                                onCommitRename={commitRename}
                                onCancelRename={dismissInteraction}
                            />

                            <div className="absolute inset-0 pointer-events-none">
                                {windows.map((win) => (
                                    <WindowFrame
                                        key={win.id}
                                        id={win.id}
                                        title={win.title}
                                        x={win.x}
                                        y={win.y}
                                        width={win.width}
                                        height={win.height}
                                        zIndex={50 + win.z}
                                        accent={WINDOW_ACCENTS[win.app]}
                                        isActive={activeWindowId === win.id}
                                        onPointerDown={() => bringToFront(win.id)}
                                        onClose={() => closeWindow(win.id)}
                                        onStartDrag={(e) => startDragWindow(win.id, e)}
                                        onStartResize={(e) => startResizeWindow(win.id, e)}
                                    >
                                        <ComputerWindowContent
                                            app={win.app}
                                            isGuest={isGuest}
                                            shopProps={shopWindowProps}
                                            roomsProps={{
                                                myRooms: myRooms ?? [],
                                                switchingRoom,
                                                canSwitchRooms,
                                                saveStatus,
                                                saveError,
                                                onRetrySave,
                                                onSwitchRoom: (roomId) => handleSwitchRoom(roomId, win.id),
                                            }}
                                            customizeProps={
                                                win.app === "customize"
                                                    ? {
                                                          displayNameProps: isGuest
                                                              ? undefined
                                                              : {
                                                                    currentDisplayName:
                                                                        currentDisplayName ?? username ?? "You",
                                                                    usernameFallback: username,
                                                                    isSaving: isSavingDisplayName,
                                                                    error: displayNameError,
                                                                    onSave: handleSaveDisplayName,
                                                                },
                                                          color: cursorColor ?? "var(--warning)",
                                                          onColorChange: onCursorColorChange ?? (() => {}),
                                                          allowColorChange: !isGuest && Boolean(onCursorColorChange),
                                                      }
                                                    : undefined
                                            }
                                            inRoomVisitors={inRoomVisitors}
                                        />
                                    </WindowFrame>
                                ))}
                            </div>
                        </div>

                        <Taskbar
                            nowLabel={formatTime(now)}
                            isStartMenuOpen={isStartMenuOpen}
                            isOnboardingShopStep={isOnboardingShopStep}
                            isDevEnv={isDevEnv}
                            devTimeOfDay={devTimeOfDay}
                            currentTimeOfDay={timeOfDay}
                            onSetDevTimeOfDay={onSetDevTimeOfDay}
                            onToggleStartMenu={toggleStartMenu}
                            onCloseStartMenu={closeStartMenu}
                            onOpenShop={() => openWindow("shop")}
                            onOpenRooms={() => openWindow("rooms")}
                            onOpenAbout={() => openWindow("about")}
                            onOpenFriends={() => openWindow("friends")}
                            pendingFriendRequests={pendingFriendRequestCount ?? 0}
                            onOpenCustomize={() => openWindow("customize")}
                            onLogout={() => {
                                closeStartMenu();
                                signOut();
                            }}
                            onShutdown={() => {
                                closeStartMenu();
                                onClose();
                            }}
                            onResetStorage={() => {
                                closeStartMenu();
                                handleDevResetStorage();
                            }}
                            onDeleteAccount={() => {
                                closeStartMenu();
                                handleDevDeleteUser();
                            }}
                            onToggleVolume={toggleVolumePanel}
                            isVolumeOpen={isVolumePanelOpen}
                            volumeLevel={keyboardVolume}
                        />

                        <VolumePanel
                            isOpen={isVolumePanelOpen}
                            onClose={closeVolumePanel}
                            keyboardVolume={keyboardVolume}
                            musicVolume={musicVolume}
                            onKeyboardVolumeChange={setKeyboardVolume}
                            onMusicVolumeChange={setMusicVolume}
                        />
                    </div>

                    <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none rounded-lg" />
                </div>
            </div>

            <InlineAddPrompt
                prompt={inlineAddPrompt}
                url={inlineAddPrompt?.value ?? ""}
                onChange={(value) => setInteraction((state) => editInteraction(state, value))}
                onAdd={handleAddShortcutInline}
                onCancel={dismissInteraction}
            />

            <DesktopContextMenu
                contextMenu={contextMenu}
                shortcuts={desktopShortcuts}
                onOpen={(shortcut) => {
                    handleOpenShortcut(shortcut);
                    setInteraction({ kind: "idle" });
                }}
                onRename={startRename}
                onDelete={handleDeleteShortcut}
                onStartAdd={startAddAtCell}
            />
        </div>
    );
}
