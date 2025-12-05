import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import {
    X,
    ShoppingBag,
    Globe,
    Monitor,
    Home,
    UserPlus,
    Clock3,
} from "lucide-react";
import { useClerk } from "@clerk/clerk-react";
import type { ComputerShortcut } from "../types";
import type { Id } from "../../convex/_generated/dataModel";
import { RoomsPanel } from "./computer/RoomsPanel";
import { InvitePanel } from "./computer/InvitePanel";
import { ShortcutsEditor } from "./computer/ShortcutsEditor";
import { Shop } from "./Shop";

type ComputerWindowApp = "shop" | "rooms" | "invite";

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

const GRID_COLUMNS = 6;
const ROW_HEIGHT = 132; // px, matches grid-auto-rows for consistent hit testing
const DESKTOP_PADDING_Y = 32; // p-4 top + bottom on desktop area
const MIN_WINDOW_WIDTH = 360;
const MIN_WINDOW_HEIGHT = 280;
const WINDOW_DEFAULTS: Record<ComputerWindowApp, { width: number; height: number }> = {
    shop: { width: 920, height: 560 },
    rooms: { width: 480, height: 440 },
    invite: { width: 420, height: 340 },
};
const WINDOW_ACCENTS: Record<ComputerWindowApp, string> = {
    shop: "from-amber-400 to-orange-500",
    rooms: "from-emerald-500 to-green-600",
    invite: "from-pink-400 to-rose-500",
};

// Get favicon URL from a website URL
function getFaviconUrl(url: string): string {
    try {
        const domain = new URL(url).hostname;
        return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
    } catch {
        return "";
    }
}

// Favicon component with fallback to Globe icon
function SiteFavicon({ url, className }: { url: string; className?: string }) {
    const [failed, setFailed] = useState(false);
    const faviconUrl = getFaviconUrl(url);

    if (failed || !faviconUrl) {
        return <Globe className={className} />;
    }

    return (
        <img
            src={faviconUrl}
            alt=""
            onError={() => setFailed(true)}
            className={className}
            draggable={false}
        />
    );
}

function normalizeShortcuts(shortcuts: ComputerShortcut[]) {
    const occupied = new Set<string>();
    const clamp = (value: number) => Math.max(0, Math.round(value));

    return shortcuts.map((shortcut, index) => {
        let row =
            typeof shortcut.row === "number" && !Number.isNaN(shortcut.row)
                ? clamp(shortcut.row)
                : Math.floor(index / GRID_COLUMNS);
        let col =
            typeof shortcut.col === "number" && !Number.isNaN(shortcut.col)
                ? clamp(shortcut.col)
                : index % GRID_COLUMNS;

        while (occupied.has(`${row}-${col}`)) {
            col++;
            if (col >= GRID_COLUMNS) {
                col = 0;
                row++;
            }
        }
        occupied.add(`${row}-${col}`);

        return { ...shortcut, row, col };
    });
}

function findNearestCell(
    event: React.DragEvent<HTMLDivElement>,
    container: HTMLDivElement,
    scale: number
) {
    const rect = container.getBoundingClientRect();
    const x = (event.clientX - rect.left) / (scale || 1);
    const y = (event.clientY - rect.top) / (scale || 1);

    const col = Math.min(
        GRID_COLUMNS - 1,
        Math.max(0, Math.round((x / rect.width) * GRID_COLUMNS - 0.5))
    );

    const row = Math.max(0, Math.round(y / ROW_HEIGHT - 0.5));

    return { row, col };
}

function formatTime(now: Date) {
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const displayHours = ((hours + 11) % 12) + 1;
    const suffix = hours >= 12 ? "PM" : "AM";
    const paddedMinutes = minutes.toString().padStart(2, "0");
    return `${displayHours}:${paddedMinutes} ${suffix}`;
}

interface ComputerScreenProps {
    shortcuts: ComputerShortcut[];
    onClose: () => void;
    onUpdateShortcuts: (shortcuts: ComputerShortcut[]) => void;
    userCurrency: number;
    onShopOpened?: () => void;
    onOnboardingPurchase?: () => void;
    isOnboardingBuyStep?: boolean;
    isOnboardingShopStep?: boolean; // For onboarding highlighting
    onPointerMove?: (clientX: number, clientY: number) => void;
}

export function ComputerScreen({
    shortcuts,
    onClose,
    onUpdateShortcuts,
    userCurrency,
    onShopOpened,
    onOnboardingPurchase,
    isOnboardingBuyStep,
    isOnboardingShopStep,
    onPointerMove,
}: ComputerScreenProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [newShortcutName, setNewShortcutName] = useState("");
    const [newShortcutUrl, setNewShortcutUrl] = useState("");
    const [copied, setCopied] = useState(false);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [draggingId, setDraggingId] = useState<string | null>(null);
    const [contextMenu, setContextMenu] = useState<{
        id: string;
        x: number;
        y: number;
    } | null>(null);
    const [isStartMenuOpen, setIsStartMenuOpen] = useState(false);
    const [now, setNow] = useState(() => new Date());
    const [desktopScale, setDesktopScale] = useState(1);
    const [windows, setWindows] = useState<ComputerWindow[]>([]);
    const [activeWindowId, setActiveWindowId] = useState<string | null>(null);
    const desktopRef = useRef<HTMLDivElement>(null);
    const dragImageRef = useRef<HTMLDivElement | null>(null);
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
    const referralCode = useQuery(api.users.getMyReferralCode);
    const referralUrl = referralCode ? `${window.location.origin}/ref/${referralCode}` : null;
    const myRooms = useQuery(api.rooms.getMyRooms);
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
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                setIsStartMenuOpen(false);
                setContextMenu(null);
            }
        };
        window.addEventListener("keydown", handleEscape);
        return () => window.removeEventListener("keydown", handleEscape);
    }, []);

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

    const normalizeAndSave = (next: ComputerShortcut[]) => {
        const normalized = normalizeShortcuts(next);
        onUpdateShortcuts(normalized);
    };

    const getDesktopBounds = () => desktopRef.current?.getBoundingClientRect() ?? null;

    const clampWindow = <T extends ComputerWindow>(win: T): T => {
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
    };

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
        const width = bounds ? Math.min(defaultSize.width, bounds.width - 16) : defaultSize.width;
        const height = bounds ? Math.min(defaultSize.height, bounds.height - 16) : defaultSize.height;
        const x = bounds ? Math.max(8, (bounds.width - width) / 2) : 40;
        const y = bounds ? Math.max(8, (bounds.height - height) / 2) : 40;
        const id = crypto.randomUUID();
        const nextZ = zCounterRef.current + 1;
        zCounterRef.current = nextZ;

        const titleMap: Record<ComputerWindowApp, string> = {
            shop: "Shop",
            rooms: "My Rooms",
            invite: "Invite Friends",
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
        [clampWindow, forwardPointerMove]
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

    const handleAddShortcut = () => {
        if (!newShortcutName.trim() || !newShortcutUrl.trim()) return;

        let url = newShortcutUrl.trim();
        if (!/^https?:\/\//i.test(url)) {
            url = "https://" + url;
        }

        const nextIndex = desktopShortcuts.length;
        const newShortcut: ComputerShortcut = {
            id: crypto.randomUUID(),
            name: newShortcutName.trim(),
            url,
            row: Math.floor(nextIndex / GRID_COLUMNS),
            col: nextIndex % GRID_COLUMNS,
            type: "user",
        };

        normalizeAndSave([...desktopShortcuts, newShortcut]);
        setNewShortcutName("");
        setNewShortcutUrl("");
        setIsEditing(false);
    };

    const handleDeleteShortcut = (id: string) => {
        const target = desktopShortcuts.find((s) => s.id === id);
        if (!target || target.type === "system") return;
        normalizeAndSave(desktopShortcuts.filter((s) => s.id !== id));
        setContextMenu(null);
    };

    const handleOpenShortcut = (shortcut: ComputerShortcut) => {
        window.open(shortcut.url, "_blank", "noopener,noreferrer");
    };

    const handleSwitchRoom = async (roomId: Id<"rooms">, windowId?: string) => {
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

    const handleDesktopClick = () => {
        setSelectedId(null);
        setContextMenu(null);
        setIsStartMenuOpen(false);
    };

    const handleContextMenuOpen = (
        event: React.MouseEvent,
        shortcut: ComputerShortcut
    ) => {
        if (shortcut.type === "system") return;
        event.preventDefault();
        setSelectedId(shortcut.id);
        setContextMenu({ id: shortcut.id, x: event.clientX, y: event.clientY });
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
                style={{ width: "min(1100px, 95vw)", height: "min(78vh, 720px)" }}
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
                        <div className="bg-gradient-to-r from-blue-900 via-blue-700 to-blue-900 text-white py-1.5 px-3 flex items-center justify-between select-none shadow-md">
                            <div className="flex items-center gap-2">
                                <Monitor className="h-4 w-4 text-blue-100" />
                                <span className="font-bold tracking-wide text-sm drop-shadow-sm">
                                    Cozy Computer
                                </span>
                            </div>
                            <button
                                onClick={onClose}
                                className="bg-gradient-to-b from-stone-200 to-stone-300 text-stone-600 hover:from-red-400 hover:to-red-500 hover:text-white transition-all p-0.5 rounded-sm border-2 border-t-white border-l-white border-b-stone-400 border-r-stone-400 w-7 h-7 flex items-center justify-center shadow-sm"
                            >
                                <X className="h-3.5 w-3.5" />
                            </button>
                        </div>

                        <div
                            ref={desktopRef}
                            className="flex-1 relative bg-[linear-gradient(90deg,rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(rgba(255,255,255,0.06)_1px,transparent_1px)] bg-[length:120px_120px] overflow-hidden p-4"
                            onClick={handleDesktopClick}
                            onDragOver={(e) => {
                                e.preventDefault();
                                forwardPointerMove(e.clientX, e.clientY);
                            }}
                            onDrop={handleDrop}
                            onPointerMove={(e) => forwardPointerMove(e.clientX, e.clientY)}
                        >
                            <div
                                className="relative w-full"
                                style={{ height: gridHeight * desktopScale || undefined }}
                            >
                                <div
                                    className="grid gap-4"
                                    style={{
                                        gridTemplateColumns: `repeat(${GRID_COLUMNS}, minmax(0, 1fr))`,
                                        gridAutoRows: `${ROW_HEIGHT}px`,
                                        transform: `scale(${desktopScale})`,
                                        transformOrigin: "top left",
                                        width: "100%",
                                        height: gridHeight || undefined,
                                    }}
                                >
                                    {orderedShortcuts.map((shortcut) => {
                                        const isSelected = selectedId === shortcut.id;
                                        const isDragging = draggingId === shortcut.id;

                                        return (
                                            <div
                                                key={shortcut.id}
                                                className="flex flex-col items-center gap-2 select-none cursor-grab active:cursor-grabbing"
                                                style={{
                                                    gridColumnStart: shortcut.col + 1,
                                                    gridRowStart: shortcut.row + 1,
                                                }}
                                                draggable
                                                onDragStart={(event) => {
                                                    event.dataTransfer.setData("text/plain", shortcut.id);
                                                    event.dataTransfer.effectAllowed = "move";
                                                    event.dataTransfer.dropEffect = "move";
                                                    createDragImage(event);
                                                    handleDragStart(shortcut.id);
                                                    document.documentElement.classList.add("cozy-cursor-drag");
                                                }}
                                                onDragEnd={() => {
                                                    setDraggingId(null);
                                                    cleanupDragImage();
                                                    document.documentElement.classList.remove("cozy-cursor-drag");
                                                }}
                                                onClick={(event) => {
                                                    event.stopPropagation();
                                                    setSelectedId(shortcut.id);
                                                    setContextMenu(null);
                                                    setIsStartMenuOpen(false);
                                                }}
                                                onDoubleClick={(event) => {
                                                    event.stopPropagation();
                                                    handleOpenShortcut(shortcut);
                                                }}
                                                onContextMenu={(event) =>
                                                    handleContextMenuOpen(event, shortcut)
                                                }
                                            >
                                                <div
                                                    className={`w-[72px] h-[72px] sm:w-20 sm:h-20 rounded-xl border border-white/30 bg-white/15 backdrop-blur-sm shadow-lg flex items-center justify-center transition-all relative ${
                                                        isSelected
                                                            ? "ring-2 ring-blue-200 bg-white/25"
                                                            : "hover:bg-white/25 hover:border-white/50"
                                                    } ${isDragging ? "opacity-60" : ""}`}
                                                >
                                                    <SiteFavicon
                                                        url={shortcut.url}
                                                        className="h-9 w-9 text-cyan-100 drop-shadow"
                                                    />
                                                </div>
                                                <span
                                                    className={`text-white text-center text-sm leading-tight drop-shadow-md px-2 py-0.5 rounded max-w-[120px] break-words ${
                                                        isSelected ? "bg-blue-900/60" : "bg-blue-900/0"
                                                    }`}
                                                >
                                                    {shortcut.name}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="absolute inset-0 pointer-events-none">
                                {windows.map((win) => (
                                    <div
                                        key={win.id}
                                        className={`absolute pointer-events-auto rounded-xl shadow-2xl flex flex-col overflow-hidden bg-stone-50 transition-shadow ${
                                            activeWindowId === win.id
                                                ? "ring-2 ring-blue-200 border-2 border-stone-700 shadow-[8px_10px_0_rgba(0,0,0,0.2)]"
                                                : "ring-1 ring-stone-200 border-2 border-stone-500"
                                        }`}
                                        style={{
                                            top: win.y,
                                            left: win.x,
                                            width: win.width,
                                            height: win.height,
                                            zIndex: 50 + win.z,
                                        }}
                                        onPointerDown={() => handleWindowPointerDown(win.id)}
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <div
                                            className={`flex items-center justify-between px-3 py-2 text-white text-sm font-bold select-none bg-gradient-to-r ${WINDOW_ACCENTS[win.app]} shadow-sm cursor-grab active:cursor-grabbing`}
                                            onPointerDown={(e) => startDragWindow(win.id, e)}
                                        >
                                            <span className="truncate">{win.title}</span>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    closeWindow(win.id);
                                                }}
                                                className="w-7 h-7 flex items-center justify-center rounded-sm bg-white/20 hover:bg-red-500 hover:text-white border border-white/40"
                                            >
                                                <X className="h-4 w-4" />
                                            </button>
                                        </div>

                                        <div className="flex-1 bg-white/90 overflow-hidden p-2">
                                            {win.app === "shop" ? (
                                                <Shop
                                                    userCurrency={userCurrency}
                                                    isOnboardingBuyStep={isOnboardingBuyStep}
                                                    onOnboardingPurchase={onOnboardingPurchase}
                                                />
                                            ) : win.app === "rooms" ? (
                                                <RoomsPanel
                                                    myRooms={myRooms}
                                                    switchingRoom={switchingRoom}
                                                    onSwitchRoom={(roomId) =>
                                                        handleSwitchRoom(roomId, win.id)
                                                    }
                                                />
                                            ) : (
                                                <InvitePanel
                                                    referralUrl={referralUrl}
                                                    copied={copied}
                                                    onCopyReferral={handleCopyReferral}
                                                />
                                            )}
                                        </div>

                                        <div
                                            className="absolute bottom-1 right-1 w-4 h-4 border-2 border-stone-400 bg-stone-200/80 rounded-sm cursor-se-resize"
                                            onPointerDown={(e) => startResizeWindow(win.id, e)}
                                        />
                                    </div>
                                ))}
                            </div>

                            {isEditing && (
                                <div className="absolute left-3 right-3 bottom-3 z-[90]">
                                    <ShortcutsEditor
                                        newShortcutName={newShortcutName}
                                        newShortcutUrl={newShortcutUrl}
                                        onNewShortcutNameChange={setNewShortcutName}
                                        onNewShortcutUrlChange={setNewShortcutUrl}
                                        onAddShortcut={handleAddShortcut}
                                        onDoneEditing={() => setIsEditing(false)}
                                    />
                                </div>
                            )}
                        </div>

                        <div className="bg-gradient-to-b from-stone-300 to-stone-200 border-t-2 border-white p-1.5 px-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.5)] text-stone-800 relative">
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setIsStartMenuOpen((prev) => !prev);
                                        setContextMenu(null);
                                    }}
                                    className="flex items-center gap-2 bg-gradient-to-b from-lime-300 to-lime-400 hover:from-lime-200 hover:to-lime-300 px-3 py-1.5 rounded border-2 border-t-white border-l-white border-b-lime-600 border-r-lime-600 shadow-sm active:border-t-lime-600 active:border-l-lime-600 active:border-b-white active:border-r-white active:translate-y-[1px] transition-all"
                                >
                                    <div className="w-5 h-5 rounded-sm bg-gradient-to-br from-emerald-500 via-lime-400 to-yellow-300 border border-emerald-800 shadow-inner" />
                                    <span className="text-sm font-semibold text-emerald-900">
                                        Start
                                    </span>
                                </button>

                                <div className="flex items-center gap-2 h-8">
                                    <button
                                        data-onboarding="shop-icon"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setIsStartMenuOpen(false);
                                            setContextMenu(null);
                                        openWindow("shop");
                                        }}
                                        title="Shop"
                                        aria-label="Shop"
                                        className={`flex items-center justify-center h-full aspect-square bg-white/70 hover:bg-white px-2 rounded border border-stone-300 shadow-sm active:translate-y-[1px] transition-all ${
                                            isOnboardingShopStep
                                                ? "ring-2 ring-amber-300 ring-offset-1 ring-offset-stone-200 animate-pulse"
                                                : ""
                                        }`}
                                    >
                                        <ShoppingBag className="h-5 w-5 text-amber-600" />
                                    </button>

                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setIsStartMenuOpen(false);
                                            setContextMenu(null);
                                            openWindow("rooms");
                                        }}
                                        title="Rooms"
                                        aria-label="Rooms"
                                        className="flex items-center justify-center h-full aspect-square bg-white/70 hover:bg-white px-2 rounded border border-stone-300 shadow-sm active:translate-y-[1px] transition-all"
                                    >
                                        <Home className="h-5 w-5 text-emerald-600" />
                                    </button>

                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setIsStartMenuOpen(false);
                                            setContextMenu(null);
                                            openWindow("invite");
                                        }}
                                        title="Invite"
                                        aria-label="Invite"
                                        className="flex items-center justify-center h-full aspect-square bg-white/70 hover:bg-white px-2 rounded border border-stone-300 shadow-sm active:translate-y-[1px] transition-all"
                                    >
                                        <UserPlus className="h-5 w-5 text-pink-600" />
                                    </button>
                                </div>

                                <div className="flex-1" />

                                <div className="flex items-center gap-2 bg-stone-300/70 border border-stone-400/60 rounded px-2 py-1 shadow-inner">
                                    <Clock3 className="h-4 w-4 text-stone-600" />
                                    <span className="font-mono text-sm text-stone-700">
                                        {formatTime(now)}
                                    </span>
                                </div>
                            </div>

                            {isStartMenuOpen && (
                                <div
                                    className="absolute bottom-12 left-2 w-64 bg-slate-50 border-2 border-slate-300 shadow-xl rounded-md overflow-hidden z-[70]"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <div className="bg-gradient-to-r from-blue-800 via-blue-700 to-blue-800 text-white px-3 py-2 text-sm font-semibold flex items-center gap-2">
                                        <div className="w-5 h-5 rounded-sm bg-gradient-to-br from-emerald-500 via-lime-400 to-yellow-300 border border-emerald-800 shadow-inner" />
                                        Cozy Start
                                    </div>
                                    <div className="flex flex-col divide-y divide-slate-200">
                                        <button
                                            className="text-left px-3 py-2 hover:bg-blue-100 text-sm"
                                            onClick={() => {
                                                setIsEditing(true);
                                                setIsStartMenuOpen(false);
                                            }}
                                        >
                                            Add shortcut…
                                        </button>
                                        <button
                                            className="text-left px-3 py-2 hover:bg-blue-100 text-sm"
                                            onClick={() => {
                                                setIsStartMenuOpen(false);
                                                signOut();
                                            }}
                                        >
                                            Log out
                                        </button>
                                        <button
                                            className="text-left px-3 py-2 hover:bg-blue-100 text-sm"
                                            onClick={() => {
                                                setIsStartMenuOpen(false);
                                                onClose();
                                            }}
                                        >
                                            Shut down
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none rounded-lg" />
                </div>
            </div>

            {contextMenu && (
                <div
                    className="fixed z-[120] bg-white border border-stone-300 rounded shadow-lg text-sm"
                    style={{ top: contextMenu.y, left: contextMenu.x }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <button
                        className="px-3 py-2 hover:bg-red-50 text-left text-red-600 w-full flex items-center gap-2"
                        onClick={() => handleDeleteShortcut(contextMenu.id)}
                    >
                        <X className="h-4 w-4" />
                        Delete shortcut
                    </button>
                </div>
            )}
        </div>
    );
}
