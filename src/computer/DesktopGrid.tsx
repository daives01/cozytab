import { useEffect, useRef, useState } from "react";
import { Globe } from "lucide-react";
import type { Shortcut } from "@/types";

interface DesktopGridProps {
    orderedShortcuts: Shortcut[];
    selectedId: string | null;
    draggingId: string | null;
    renamingId: string | null;
    renameValue: string;
    desktopScale: number;
    gridHeight: number;
    columns: number;
    rowHeight: number;
    onSelect: (id: string) => void;
    onDoubleClick: (shortcut: Shortcut) => void;
    onContextMenu: (event: React.MouseEvent, shortcut: Shortcut) => void;
    onDragStart: (event: React.DragEvent<HTMLDivElement>, shortcut: Shortcut) => void;
    onDragEnd: () => void;
    onRenameChange: (value: string) => void;
    onCommitRename: (id: string) => void;
    onCancelRename: () => void;
}

function getFaviconUrl(url: string): string {
    try {
        const domain = new URL(url).hostname;
        let appDomain: string;
        try {
            appDomain = new URL(import.meta.env.VITE_APP_URL || window.location.origin).hostname;
        } catch {
            // Fallback to window.location.origin if VITE_APP_URL is invalid
            appDomain = new URL(window.location.origin).hostname;
        }

        if (domain === appDomain || domain.endsWith(`.${appDomain}`)) {
            return "/favicon.svg";
        }
        return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
    } catch {
        return "";
    }
}

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

export function DesktopGrid({
    orderedShortcuts,
    selectedId,
    draggingId,
    renamingId,
    renameValue,
    desktopScale,
    gridHeight,
    columns,
    rowHeight,
    onSelect,
    onDoubleClick,
    onContextMenu,
    onDragStart,
    onDragEnd,
    onRenameChange,
    onCommitRename,
    onCancelRename,
}: DesktopGridProps) {
    const renameInputRef = useRef<HTMLInputElement | null>(null);

    useEffect(() => {
        if (!renamingId) return;
        requestAnimationFrame(() => {
            renameInputRef.current?.focus();
            renameInputRef.current?.select();
        });
    }, [renamingId]);

    return (
        <div
            className="relative w-full"
            style={{ height: gridHeight * desktopScale || undefined }}
        >
            <div
                className="grid gap-4"
                style={{
                    gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
                    gridAutoRows: `${rowHeight}px`,
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
                                onDragStart(event, shortcut);
                            }}
                            onDragEnd={onDragEnd}
                            onClick={(event) => {
                                event.stopPropagation();
                                onSelect(shortcut.id);
                            }}
                            onDoubleClick={(event) => {
                                event.stopPropagation();
                                if (renamingId !== shortcut.id) {
                                    onDoubleClick(shortcut);
                                }
                            }}
                            onContextMenu={(event) => onContextMenu(event, shortcut)}
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
                            {renamingId === shortcut.id ? (
                                <input
                                    ref={renameInputRef}
                                    value={renameValue}
                                    onChange={(e) => onRenameChange(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                            e.preventDefault();
                                            onCommitRename(shortcut.id);
                                        }
                                        if (e.key === "Escape") {
                                            e.preventDefault();
                                            onCancelRename();
                                        }
                                    }}
                                    onBlur={() => onCommitRename(shortcut.id)}
                                    className="text-sm text-blue-900 bg-white rounded px-2 py-1 w-[120px] text-center shadow-inner border border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-300"
                                    spellCheck={false}
                                    onClick={(e) => e.stopPropagation()}
                                />
                            ) : (
                                <span
                                    className={`text-white text-center text-sm leading-tight drop-shadow-md px-2 py-0.5 rounded max-w-[120px] break-words ${
                                        isSelected ? "bg-blue-900/60" : "bg-blue-900/0"
                                    }`}
                                >
                                    {shortcut.name}
                                </span>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
