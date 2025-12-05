import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useClerk } from "@clerk/clerk-react";
import type { ComputerShortcut } from "../types";
import type { Id } from "../../convex/_generated/dataModel";
import { GUEST_STARTING_COINS } from "../../shared/guestTypes";
import { clearGuestSession } from "./guestSession";
import { WindowFrame } from "./computer/WindowFrame";
import { ComputerWindowContent } from "./computer/ComputerWindowContent";
import type { ComputerWindowApp } from "./computer/computerTypes";
import { DesktopGrid } from "./computer/DesktopGrid";
import { InlineAddPrompt } from "./computer/InlineAddPrompt";
import { DesktopContextMenu, type ContextMenuState } from "./computer/DesktopContextMenu";
import { Taskbar, WindowHeader } from "./computer/Taskbar";
import {
    GRID_COLUMNS,
    ROW_HEIGHT,
    DESKTOP_PADDING_Y,
    MIN_WINDOW_HEIGHT,
    MIN_WINDOW_WIDTH,
    WINDOW_ACCENTS,
    WINDOW_DEFAULTS,
    deriveShortcutName,
    findCellFromPoint,
    findNearestCell,
    formatTime,
    normalizeShortcuts,
    withProtocol,
} from "./computer/desktopUtils";

interface ComputerWindow {
    id: string;
    app: ComputerWindowApp;
    title: string;
    x: number;
    y: number;
    width: number;
    height: number;
    z: number;
}

interface ComputerScreenProps {
    shortcuts: ComputerShortcut[];
    onClose: () => void;
    onUpdateShortcuts: (shortcuts: ComputerShortcut[]) => void;
    userCurrency: number;
    lastDailyReward?: number;
    onShopOpened?: () => void;
    onOnboardingPurchase?: () => void;
    onOnboardingShortcutAdded?: () => void;
    isOnboardingShopStep?: boolean; // For onboarding highlighting
    onPointerMove?: (clientX: number, clientY: number) => void;
    isGuest?: boolean;
    guestCoins?: number;
    onGuestCoinsChange?: (coins: number) => void;
    startingCoins?: number;
    guestInventory?: string[];
    onGuestPurchase?: (catalogItemId: string) => void;
    highlightFirstMusicItem?: boolean;
}

export function ComputerScreen({
    shortcuts,
    onClose,
    onUpdateShortcuts,
    userCurrency,
    lastDailyReward,
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
}: ComputerScreenProps) {
    const [newShortcutUrl, setNewShortcutUrl] = useState("");
    const [copied, setCopied] = useState(false);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [draggingId, setDraggingId] = useState<string | null>(null);
    const [renamingId, setRenamingId] = useState<string | null>(null);
    const [renameValue, setRenameValue] = useState("");
    const [contextMenu, setContextMenu] = useState<ContextMenuState>(null);
    const [inlineAddPrompt, setInlineAddPrompt] = useState<{
        x: number;
        y: number;
        row: number;
        col: number;
    } | null>(null);
    const [isStartMenuOpen, setIsStartMenuOpen] = useState(false);
    const [now, setNow] = useState(() => new Date());
    const [desktopScale, setDesktopScale] = useState(1);
    const [windows, setWindows] = useState<ComputerWindow[]>([]);
    const [activeWindowId, setActiveWindowId] = useState<string | null>(null);
    const desktopRef = useRef<HTMLDivElement>(null);
    const dragImageRef = useRef<HTMLDivElement | null>(null);
    const [pendingShortcutPosition, setPendingShortcutPosition] = useState<{
        row: number;
        col: number;
    } | null>(null);
    const zCounterRef = useRef(1);
    const dragWindowRef = useRef<{
        id: string;
        startX: number;
        startY: number;
        originX: number;
        originY: number;
    } | null>(null);
    const resizeWindowRef = useRef<{
        id: string;
        startX: number;
        startY: number;
        originW: number;
        originH: number;
    } | null>(null);
    const windowsRef = useRef<ComputerWindow[]>([]);
    const { signOut } = useClerk();
    const isDevEnv = import.meta.env.DEV;
    const devDeleteMyAccount = useMutation(api.users.devDeleteMyAccount);
    const referralCode = useQuery(api.users.getMyReferralCode, isGuest ? "skip" : undefined);
    const referralUrl = referralCode ? `${window.location.origin}/ref/${referralCode}` : null;
    const myRooms = useQuery(api.rooms.getMyRooms, isGuest ? "skip" : undefined);
    const setActiveRoom = useMutation(api.rooms.setActiveRoom);
    const [switchingRoom, setSwitchingRoom] = useState<Id<"rooms"> | null>(null);

    const desktopShortcuts = useMemo(
        () => normalizeShortcuts(shortcuts ?? []).filter((s) => s.type !== "system"),
        [shortcuts]
    );

    const orderedShortcuts = useMemo(
        () =>
            [...desktopShortcuts].sort((a, b) =>
                a.row === b.row ? a.col - b.col : a.row - b.row
            ),
        [desktopShortcuts]
    );

    const maxRowIndex = useMemo(
        () => orderedShortcuts.reduce((max, s) => Math.max(max, s.row ?? 0), 0),
        [orderedShortcuts]
    );

    const gridHeight = useMemo(
        () => (Math.max(0, maxRowIndex) + 1) * ROW_HEIGHT,
        [maxRowIndex]
    );

    const recomputeScale = useCallback(() => {
        if (!desktopRef.current) return;
        const availableHeight = desktopRef.current.clientHeight - DESKTOP_PADDING_Y;
        if (availableHeight <= 0 || gridHeight <= 0) {
            setDesktopScale(1);
            return;
        }
        const scale = Math.min(1, availableHeight / gridHeight);
        setDesktopScale(scale);
    }, [gridHeight]);

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

    useEffect(() => {
        windowsRef.current = windows;
    }, [windows]);

    const forwardPointerMove = useCallback(
        (clientX: number, clientY: number) => {
            if (!onPointerMove) return;
            onPointerMove(clientX, clientY);
        },
        [onPointerMove]
    );

    const handleCopyReferral = async () => {
        if (!referralUrl) return;
        await navigator.clipboard.writeText(referralUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleDevDeleteUser = async () => {
        try {
            await devDeleteMyAccount({});
            await signOut();
        } catch (error) {
            console.error("Dev delete failed", error);
        }
    };

    const handleDevResetStorage = () => {
        try {
            localStorage.clear();
            sessionStorage.clear();
            clearGuestSession();
        } catch (error) {
            console.error("Storage reset failed", error);
        }
    };

    const normalizeAndSave = useCallback(
        (next: ComputerShortcut[]) => {
            const normalized = normalizeShortcuts(next);
            onUpdateShortcuts(normalized);
        },
        [onUpdateShortcuts]
    );

    const cancelRename = useCallback(() => {
        setRenamingId(null);
        setRenameValue("");
    }, []);

    const getDesktopBounds = useCallback(
        () => desktopRef.current?.getBoundingClientRect() ?? null,
        []
    );

    const clampWindow = useCallback(
        <T extends ComputerWindow>(win: T): T => {
            const bounds = getDesktopBounds();
            if (!bounds) return win;
            const maxX = Math.max(0, bounds.width - win.width);
            const maxY = Math.max(0, bounds.height - win.height);
            return {
                ...win,
                x: Math.min(Math.max(0, win.x), maxX),
                y: Math.min(Math.max(0, win.y), maxY),
                width: Math.min(Math.max(MIN_WINDOW_WIDTH, win.width), bounds.width),
                height: Math.min(Math.max(MIN_WINDOW_HEIGHT, win.height), bounds.height),
            } as T;
        },
        [getDesktopBounds]
    );

    const bringToFront = (id: string) => {
        const nextZ = zCounterRef.current + 1;
        zCounterRef.current = nextZ;
        setWindows((prev) =>
            prev.map((win) => (win.id === id ? { ...win, z: nextZ } : win))
        );
        setActiveWindowId(id);
    };

    const openWindow = (app: ComputerWindowApp) => {
        const existing = windowsRef.current.find((win) => win.app === app);
        if (existing) {
            bringToFront(existing.id);
            if (app === "shop") {
                onShopOpened?.();
            }
            return;
        }

        const bounds = getDesktopBounds();
        const defaultSize = WINDOW_DEFAULTS[app];

        const isShop = app === "shop";
        const width = bounds
            ? isShop
                ? bounds.width
                : Math.min(defaultSize.width, bounds.width - 16)
            : defaultSize.width;
        const height = bounds
            ? isShop
                ? bounds.height
                : Math.min(defaultSize.height, bounds.height - 16)
            : defaultSize.height;
        const x = bounds ? (isShop ? 0 : Math.max(8, (bounds.width - width) / 2)) : 40;
        const y = bounds ? (isShop ? 0 : Math.max(8, (bounds.height - height) / 2)) : 40;
        const id = crypto.randomUUID();
        const nextZ = zCounterRef.current + 1;
        zCounterRef.current = nextZ;

        const titleMap: Record<ComputerWindowApp, string> = {
            shop: "Shop",
            rooms: "My Rooms",
            invite: "Invite Friends",
            about: "About Cozytab",
        };

        const newWindow: ComputerWindow = {
            id,
            app,
            title: titleMap[app],
            x,
            y,
            width,
            height,
            z: nextZ,
        };

        setWindows((prev) => [...prev, clampWindow(newWindow)]);
        setActiveWindowId(id);
        if (app === "shop") {
            onShopOpened?.();
        }
    };

    const closeWindow = (id: string) => {
        setWindows((prev) => prev.filter((win) => win.id !== id));
        setActiveWindowId((current) => (current === id ? null : current));
        if (dragWindowRef.current?.id === id) {
            dragWindowRef.current = null;
        }
        if (resizeWindowRef.current?.id === id) {
            resizeWindowRef.current = null;
        }
    };

    const handleWindowPointerDown = (id: string) => {
        bringToFront(id);
    };

    const startDragWindow = (
        id: string,
        event: React.PointerEvent<HTMLDivElement>
    ) => {
        const targetWindow = windowsRef.current.find((win) => win.id === id);
        if (!targetWindow) return;
        handleWindowPointerDown(id);
        dragWindowRef.current = {
            id,
            startX: event.clientX,
            startY: event.clientY,
            originX: targetWindow.x,
            originY: targetWindow.y,
        };
        event.preventDefault();
    };

    const startResizeWindow = (
        id: string,
        event: React.PointerEvent<HTMLDivElement>
    ) => {
        const targetWindow = windowsRef.current.find((win) => win.id === id);
        if (!targetWindow) return;
        handleWindowPointerDown(id);
        resizeWindowRef.current = {
            id,
            startX: event.clientX,
            startY: event.clientY,
            originW: targetWindow.width,
            originH: targetWindow.height,
        };
        event.preventDefault();
    };

    const handlePointerMove = useCallback(
        (event: PointerEvent) => {
            const dragState = dragWindowRef.current;
            const resizeState = resizeWindowRef.current;

            if (!dragState && !resizeState) return;

            if (dragState) {
                const deltaX = event.clientX - dragState.startX;
                const deltaY = event.clientY - dragState.startY;
                const bounds = getDesktopBounds();
                if (!bounds) return;
                setWindows((prev) =>
                    prev.map((win) => {
                        if (win.id !== dragState.id) return win;
                        const next = clampWindow({
                            ...win,
                            x: dragState.originX + deltaX,
                            y: dragState.originY + deltaY,
                        });
                        return { ...win, x: next.x, y: next.y };
                    })
                );
                forwardPointerMove(event.clientX, event.clientY);
            }

            if (resizeState) {
                const deltaX = event.clientX - resizeState.startX;
                const deltaY = event.clientY - resizeState.startY;
                setWindows((prev) =>
                    prev.map((win) => {
                        if (win.id !== resizeState.id) return win;
                        const clamped = clampWindow({
                            ...win,
                            width: resizeState.originW + deltaX,
                            height: resizeState.originH + deltaY,
                        });
                        return { ...win, width: clamped.width, height: clamped.height };
                    })
                );
                forwardPointerMove(event.clientX, event.clientY);
            }
        },
        [clampWindow, forwardPointerMove, getDesktopBounds]
    );

    const stopWindowInteractions = useCallback(() => {
        dragWindowRef.current = null;
        resizeWindowRef.current = null;
    }, []);

    useEffect(() => {
        window.addEventListener("pointermove", handlePointerMove);
        window.addEventListener("pointerup", stopWindowInteractions);
        return () => {
            window.removeEventListener("pointermove", handlePointerMove);
            window.removeEventListener("pointerup", stopWindowInteractions);
        };
    }, [handlePointerMove, stopWindowInteractions]);

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
            const scale = desktopScale || 1;

            const clone = target.cloneNode(true) as HTMLDivElement;
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
        [cleanupDragImage, desktopScale]
    );

    const handleAddShortcutInline = () => {
        if (!pendingShortcutPosition || !newShortcutUrl.trim()) return;

        const url = withProtocol(newShortcutUrl.trim());
        const { row, col } = pendingShortcutPosition;
        const newId = crypto.randomUUID();
        const initialName = deriveShortcutName(url);
        const newShortcut: ComputerShortcut = {
            id: newId,
            name: initialName,
            url,
            row,
            col,
            type: "user",
        };

        normalizeAndSave([...desktopShortcuts, newShortcut]);
        setNewShortcutUrl("");
        setPendingShortcutPosition(null);
        setInlineAddPrompt(null);
        setSelectedId(newId);
        setRenamingId(newId);
        setRenameValue(initialName);
        onOnboardingShortcutAdded?.();
    };

    const handleDeleteShortcut = useCallback(
        (id: string) => {
            const target = desktopShortcuts.find((s) => s.id === id);
            if (!target || target.type === "system") return;
            normalizeAndSave(desktopShortcuts.filter((s) => s.id !== id));
            setContextMenu(null);
        },
        [desktopShortcuts, normalizeAndSave]
    );

    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement | null;
            const isTypingTarget =
                target &&
                (target.tagName === "INPUT" ||
                    target.tagName === "TEXTAREA" ||
                    target.getAttribute("contenteditable") === "true");

            if (e.key === "Escape") {
                setIsStartMenuOpen(false);
                setContextMenu(null);
                if (renamingId) {
                    cancelRename();
                }
                if (inlineAddPrompt) {
                    setInlineAddPrompt(null);
                    setPendingShortcutPosition(null);
                    setNewShortcutUrl("");
                }
                return;
            }

            if (e.key === "Enter") {
                if (isTypingTarget || renamingId || draggingId || inlineAddPrompt) return;
                const selected = desktopShortcuts.find((s) => s.id === selectedId);
                if (selected) {
                    e.preventDefault();
                    setContextMenu(null);
                    setIsStartMenuOpen(false);
                    handleOpenShortcut(selected);
                }
            }

            if (e.key === "Backspace" || e.key === "Delete") {
                if (isTypingTarget || renamingId || draggingId || inlineAddPrompt) return;
                const selected = desktopShortcuts.find((s) => s.id === selectedId);
                if (selected && selected.type !== "system") {
                    e.preventDefault();
                    handleDeleteShortcut(selected.id);
                }
            }
        };
        window.addEventListener("keydown", handleKey);
        return () => window.removeEventListener("keydown", handleKey);
    }, [cancelRename, desktopShortcuts, draggingId, handleDeleteShortcut, inlineAddPrompt, renamingId, selectedId]);

    function commitRename(id: string) {
        const target = desktopShortcuts.find((s) => s.id === id);
        if (!target || target.type === "system") {
            cancelRename();
            return;
        }
        const trimmedName = renameValue.trim();
        if (!trimmedName) {
            cancelRename();
            return;
        }
        normalizeAndSave(
            desktopShortcuts.map((s) => (s.id === id ? { ...s, name: trimmedName } : s))
        );
        setSelectedId(id);
        cancelRename();
    }

    const startRename = (id: string) => {
        const target = desktopShortcuts.find((s) => s.id === id);
        if (!target || target.type === "system") return;
        setSelectedId(id);
        setContextMenu(null);
        setIsStartMenuOpen(false);
        setRenamingId(id);
        setRenameValue(target.name);
    };

    const handleOpenShortcut = (shortcut: ComputerShortcut) => {
        window.open(shortcut.url, "_blank", "noopener,noreferrer");
    };

    const handleSwitchRoom = async (roomId: Id<"rooms">, windowId?: string) => {
        if (isGuest) return;
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

        const updated = desktopShortcuts.map((s) =>
            s.id === draggingId ? { ...s, row, col } : s
        );

        normalizeAndSave(updated);
        cleanupDragImage();
        setDraggingId(null);
    };

    const handleDragStart = (id: string) => {
        setDraggingId(id);
        setContextMenu(null);
        setIsStartMenuOpen(false);
    };

    const startShortcutDrag = (
        event: React.DragEvent<HTMLDivElement>,
        shortcut: ComputerShortcut
    ) => {
        event.dataTransfer.setData("text/plain", shortcut.id);
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.dropEffect = "move";
        createDragImage(event);
        handleDragStart(shortcut.id);
        document.documentElement.classList.add("cozy-cursor-drag");
    };

    const endShortcutDrag = () => {
        setDraggingId(null);
        cleanupDragImage();
        document.documentElement.classList.remove("cozy-cursor-drag");
    };

    const handleDesktopClick = () => {
        setSelectedId(null);
        setContextMenu(null);
        setIsStartMenuOpen(false);
        if (renamingId) {
            cancelRename();
        }
        if (inlineAddPrompt) {
            setInlineAddPrompt(null);
            setPendingShortcutPosition(null);
            setNewShortcutUrl("");
        }
    };

    const toggleStartMenu = () => {
        setIsStartMenuOpen((prev) => !prev);
        setContextMenu(null);
    };

    const closeStartMenu = () => setIsStartMenuOpen(false);

    const handleContextMenuOpen = (
        event: React.MouseEvent,
        shortcut: ComputerShortcut
    ) => {
        if (shortcut.type === "system") return;
        event.preventDefault();
        event.stopPropagation();
        setSelectedId(shortcut.id);
        setContextMenu({ target: "shortcut", id: shortcut.id, x: event.clientX, y: event.clientY });
    };

    const handleDesktopContextMenu = (event: React.MouseEvent<HTMLDivElement>) => {
        event.preventDefault();
        const target = event.target as HTMLElement;
        if (target.closest("[data-window]")) return;
        if (!desktopRef.current) return;
        const { row, col } = findCellFromPoint(
            event.clientX,
            event.clientY,
            desktopRef.current,
            desktopScale
        );
        setSelectedId(null);
        setContextMenu({
            target: "desktop",
            x: event.clientX,
            y: event.clientY,
            row,
            col,
        });
        setIsStartMenuOpen(false);
    };

    const startAddAtCell = (row: number, col: number, x: number, y: number) => {
        setPendingShortcutPosition({ row, col });
        setNewShortcutUrl("");
        setInlineAddPrompt({ row, col, x, y });
        setContextMenu(null);
        setSelectedId(null);
        setRenamingId(null);
    };

    const shopWindowProps = {
        userCurrency,
        lastDailyReward,
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
            onClick={() => {
                setIsStartMenuOpen(false);
                setContextMenu(null);
                onClose();
            }}
        >
            <div
                className="relative bg-stone-200 rounded-3xl p-4 shadow-2xl border-b-8 border-r-8 border-stone-300"
                style={{ width: "min(1300px, 98vw)", height: "min(92vh, 880px)" }}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-stone-300/80 px-4 py-1 rounded-t-lg">
                    <span className="text-stone-500 font-bold text-[10px] uppercase tracking-[0.2em]">
                        COZYSYS 98
                    </span>
                    <div className="w-2 h-2 rounded-full bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.8)] animate-pulse" />
                </div>

                <div className="bg-stone-800 rounded-xl p-1 overflow-hidden h-full shadow-inner relative border-2 border-stone-400/50">
                    <div className="w-full h-full bg-[#006b96] flex flex-col relative overflow-hidden">
                        <WindowHeader onClose={onClose} />

                        <div
                            ref={desktopRef}
                            data-onboarding="shortcut-desktop"
                            className="flex-1 relative bg-[linear-gradient(90deg,rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(rgba(255,255,255,0.06)_1px,transparent_1px)] bg-[length:120px_120px] overflow-hidden p-4"
                            onClick={handleDesktopClick}
                            onDragOver={(e) => {
                                e.preventDefault();
                                forwardPointerMove(e.clientX, e.clientY);
                            }}
                            onDrop={handleDrop}
                            onPointerMove={(e) => forwardPointerMove(e.clientX, e.clientY)}
                            onContextMenu={handleDesktopContextMenu}
                        >
                            <DesktopGrid
                                orderedShortcuts={orderedShortcuts}
                                selectedId={selectedId}
                                draggingId={draggingId}
                                renamingId={renamingId}
                                renameValue={renameValue}
                                desktopScale={desktopScale}
                                gridHeight={gridHeight}
                                columns={GRID_COLUMNS}
                                rowHeight={ROW_HEIGHT}
                                onSelect={(id) => {
                                    setSelectedId(id);
                                    setContextMenu(null);
                                    setIsStartMenuOpen(false);
                                }}
                                onDoubleClick={handleOpenShortcut}
                                onContextMenu={handleContextMenuOpen}
                                onDragStart={startShortcutDrag}
                                onDragEnd={endShortcutDrag}
                                onRenameChange={setRenameValue}
                                onCommitRename={commitRename}
                                onCancelRename={cancelRename}
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
                                        onPointerDown={() => handleWindowPointerDown(win.id)}
                                        onClose={() => closeWindow(win.id)}
                                        onStartDrag={(e) => startDragWindow(win.id, e)}
                                        onStartResize={(e) => startResizeWindow(win.id, e)}
                                    >
                                        <ComputerWindowContent
                                            app={win.app}
                                            shopProps={shopWindowProps}
                                            roomsProps={{
                                                myRooms: myRooms ?? [],
                                                switchingRoom,
                                                onSwitchRoom: (roomId) => handleSwitchRoom(roomId, win.id),
                                            }}
                                            inviteProps={{
                                                referralUrl,
                                                copied,
                                                onCopyReferral: handleCopyReferral,
                                                isGuest,
                                            }}
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
                            onToggleStartMenu={toggleStartMenu}
                            onCloseStartMenu={closeStartMenu}
                            onOpenShop={() => openWindow("shop")}
                            onOpenRooms={() => openWindow("rooms")}
                            onOpenInvite={() => openWindow("invite")}
                            onOpenAbout={() => openWindow("about")}
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
                        />
                    </div>

                    <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none rounded-lg" />
                </div>
            </div>

            <InlineAddPrompt
                prompt={inlineAddPrompt}
                url={newShortcutUrl}
                onChange={setNewShortcutUrl}
                onAdd={handleAddShortcutInline}
                onCancel={() => {
                    setInlineAddPrompt(null);
                    setPendingShortcutPosition(null);
                    setNewShortcutUrl("");
                }}
            />

            <DesktopContextMenu
                contextMenu={contextMenu}
                shortcuts={desktopShortcuts}
                onOpen={(shortcut) => {
                    handleOpenShortcut(shortcut);
                    setContextMenu(null);
                }}
                onRename={startRename}
                onDelete={handleDeleteShortcut}
                onStartAdd={startAddAtCell}
            />
        </div>
    );
}
